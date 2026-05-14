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

    // Wipe all application data in one transaction, in FK-safe order:
    //   transactions → accounts → (insights, preferences, subscriptions) → users
    // Transactions are joined via accountId (no userId column), so we delete
    // them by accountId subselect before clearing accounts.
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

    // Remove from Better Auth — best-effort. App data is already wiped above,
    // so a failure here just means the auth row sticks around (next login
    // attempt would no-op our DB row creation; user can re-register fresh).
    try {
      await (auth.api as any).deleteUser({ body: { userId: betterAuthId } });
    } catch (err) {
      this.logger.warn(
        `Better Auth deleteUser failed for ${betterAuthId}: ${(err as Error)?.message ?? err}`,
      );
    }
  }
}
