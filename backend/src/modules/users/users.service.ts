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

    // Wipe everything in a single transaction so we don't end up with a
    // half-deleted user (auth tables gone but app data lingering, or vice
    // versa). Order is FK-safe:
    //
    //   App tables:    transactions → accounts → (insights, preferences,
    //                                              subscriptions) → users
    //   Better Auth:   session → account → verification → "user"
    //
    // Better Auth manages its own tables ("user", "session", "account",
    // "verification") via the shared Postgres pool we passed to betterAuth().
    // We can't use auth.api.deleteUser because it's a session-scoped HTTP
    // endpoint that requires `user.deleteUser.enabled: true` in the auth
    // config (it isn't) and has a different body shape than our previous
    // code assumed. Writing raw SQL is the simplest correct path — the
    // table names are Better Auth defaults and we don't override them.
    //
    // "user" is quoted because it collides with the Postgres reserved word.
    await this.dataSource.transaction(async (em) => {
      // ── App data ─────────────────────────────────────────────────────
      await em.query(
        `DELETE FROM transactions WHERE "accountId" IN (SELECT id FROM accounts WHERE "userId" = $1)`,
        [user.id],
      );
      await em.query(`DELETE FROM accounts      WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM insights      WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM preferences   WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM subscriptions WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM users         WHERE id        = $1`, [user.id]);

      // ── Better Auth ──────────────────────────────────────────────────
      // Wipe every session this user has anywhere (invalidates other devices
      // too) before removing the auth user row.
      await em.query(`DELETE FROM "session"      WHERE "userId" = $1`, [betterAuthId]);
      await em.query(`DELETE FROM "account"      WHERE "userId" = $1`, [betterAuthId]);
      // verification rows are keyed by identifier (email / phone), not userId.
      if (user.email) {
        await em.query(`DELETE FROM "verification" WHERE identifier = $1`, [user.email]);
      }
      await em.query(`DELETE FROM "user"         WHERE id = $1`, [betterAuthId]);
    });

    this.logger.log(`Deleted account ${betterAuthId} (app + auth)`);
  }
}
