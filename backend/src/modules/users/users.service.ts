import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Preference, UserGoal } from '../../entities/preference.entity';
import { RegisterDto, UpdatePreferencesDto } from './dto/onboarding.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Preference)
    private readonly preferenceRepo: Repository<Preference>,
    private readonly dataSource: DataSource,
  ) {}

  async upsert(betterAuthId: string, dto: Partial<RegisterDto>): Promise<User> {
    let user = await this.userRepo.findOne({ where: { betterAuthId } });

    if (!user) {
      user = this.userRepo.create({
        betterAuthId,
        email: dto.email,
        displayName: dto.displayName,
        location: dto.location,
      });
      user = await this.userRepo.save(user);

      await this.preferenceRepo.save(
        this.preferenceRepo.create({
          userId: user.id,
          goal: null,
          interests: [],
          location: dto.location,
        }),
      );
    }

    return user;
  }

  async findByBetterAuthId(betterAuthId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { betterAuthId },
      relations: ['preference'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getPreferences(userId: string): Promise<Preference> {
    const pref = await this.preferenceRepo.findOne({ where: { userId } });
    if (!pref) throw new NotFoundException('Preferences not found');
    return pref;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<Preference> {
    let pref = await this.preferenceRepo.findOne({ where: { userId } });
    if (!pref) {
      pref = this.preferenceRepo.create({ userId, goal: null });
    }
    Object.assign(pref, dto);
    return this.preferenceRepo.save(pref);
  }

  async updateProfile(
    betterAuthId: string,
    updates: Partial<Pick<User, 'displayName' | 'location'>>,
  ): Promise<User> {
    const user = await this.findByBetterAuthId(betterAuthId);
    Object.assign(user, updates);
    return this.userRepo.save(user);
  }

  async savePushToken(betterAuthId: string, expoPushToken: string): Promise<void> {
    const user = await this.findByBetterAuthId(betterAuthId);
    user.expoPushToken = expoPushToken;
    await this.userRepo.save(user);
  }

  async deleteAccount(betterAuthId: string): Promise<void> {
    const user = await this.findByBetterAuthId(betterAuthId);

    // Step 1: atomically wipe our application data. This MUST succeed or
    // throw — leaving accounts/transactions/insights behind is the worst
    // failure mode. Order is FK-safe:
    //   transactions → accounts → (insights, preferences, subscriptions)
    //                            → users
    await this.dataSource.transaction(async (em) => {
      await em.query(
        `DELETE FROM transactions WHERE "accountId" IN (SELECT id FROM accounts WHERE "userId" = $1)`,
        [user.id],
      );
      await em.query(`DELETE FROM accounts      WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM insights      WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM preferences   WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM subscriptions WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM users         WHERE id        = $1`, [user.id]);
    });

    // Step 2: best-effort cleanup of Better Auth + plugin tables. Each
    // statement runs in its own try/catch — a missing table (some plugins
    // are conditional), an FK violation, or a row that was never created
    // shouldn't abort the rest. The critical pair is `session` + `account`:
    // wiping those alone makes it impossible for the user to log back in
    // even if the `"user"` row stickily survives.
    //
    // Order matters when it succeeds:
    //   org plugin (member, teamMember, invitation) → account → session
    //   → verification → "user"
    //
    // Table names are Better Auth defaults (confirmed against
    // @better-auth/core/dist/db/get-tables.mjs). "user" is quoted because
    // it collides with the Postgres reserved word.
    const authCleanups: Array<{ label: string; sql: string; params: unknown[] }> = [
      { label: 'org.member',      sql: `DELETE FROM "member"       WHERE "userId" = $1`, params: [betterAuthId] },
      { label: 'org.teamMember',  sql: `DELETE FROM "teamMember"   WHERE "userId" = $1`, params: [betterAuthId] },
      { label: 'org.invitation',  sql: `DELETE FROM "invitation"   WHERE "inviterId" = $1`, params: [betterAuthId] },
      { label: 'session',         sql: `DELETE FROM "session"      WHERE "userId" = $1`, params: [betterAuthId] },
      { label: 'account',         sql: `DELETE FROM "account"      WHERE "userId" = $1`, params: [betterAuthId] },
    ];
    if (user.email) {
      authCleanups.push({
        label: 'verification',
        sql: `DELETE FROM "verification" WHERE identifier = $1`,
        params: [user.email],
      });
    }
    authCleanups.push({ label: 'user', sql: `DELETE FROM "user" WHERE id = $1`, params: [betterAuthId] });

    for (const step of authCleanups) {
      try {
        await this.dataSource.query(step.sql, step.params);
      } catch (err) {
        // Common reasons we don't want to abort:
        //   42P01 "relation does not exist" — plugin table not created on this env
        //   23503 foreign_key_violation     — a row we don't know about references the user
        this.logger.warn(
          `Better Auth cleanup [${step.label}] skipped: ${(err as Error)?.message ?? err}`,
        );
      }
    }

    this.logger.log(`Deleted account ${betterAuthId} (app data wiped; auth best-effort)`);
  }
}
