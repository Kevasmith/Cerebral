import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Preference, UserGoal } from '../../entities/preference.entity';
import { RegisterDto, UpdatePreferencesDto } from './dto/onboarding.dto';
import { auth } from '../../auth/auth';

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

    // Step 2: delete the Better Auth user via the library's own adapter.
    //
    // Previously this was raw SQL against "user"/"session"/"account" which
    // had two risks: the column names might not match (Postgres folds
    // unquoted identifiers to lowercase, and we couldn't be sure how Better
    // Auth's migration tool created them), and the plugin tables (member,
    // teamMember, invitation, etc.) have their own FK constraints that
    // would block a naked DELETE FROM "user".
    //
    // auth.$context resolves to the same adapter Better Auth itself uses
    // for /api/auth/* requests. internalAdapter.deleteUser(userId):
    //   1. deletes every session row for the user (invalidates other devices)
    //   2. deletes every account row (credential, OAuth, etc.)
    //   3. deletes the user row itself
    // Better Auth's table creation sets ON DELETE CASCADE on plugin FKs
    // (member.userId, teamMember.userId, invitation.inviterId), so removing
    // the user row sweeps the rest.
    try {
      const ctx = await auth.$context;
      await ctx.internalAdapter.deleteUser(betterAuthId);
      this.logger.log(`Deleted Better Auth user ${betterAuthId}`);
    } catch (err) {
      // App data is already wiped; rethrow so the controller returns 500
      // and the user knows their auth side wasn't cleared. Better that than
      // silently leaving the auth user behind and letting them log back in.
      this.logger.error(
        `Better Auth deleteUser failed for ${betterAuthId}: ${(err as Error)?.message ?? err}`,
      );
      throw err;
    }

    // Belt-and-suspenders: wipe verification rows by email (these are keyed
    // by identifier, not userId, so the adapter's deleteUser doesn't touch
    // them). Failure here is logged but not thrown — orphaned verification
    // rows are harmless.
    if (user.email) {
      try {
        await this.dataSource.query(
          `DELETE FROM "verification" WHERE identifier = $1`,
          [user.email],
        );
      } catch (err) {
        this.logger.warn(
          `verification cleanup skipped: ${(err as Error)?.message ?? err}`,
        );
      }
    }

    this.logger.log(`Deleted account ${betterAuthId} (app + auth)`);
  }
}
