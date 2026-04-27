import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Preference, UserGoal } from '../../entities/preference.entity';
import { RegisterDto, UpdatePreferencesDto } from './dto/onboarding.dto';
import { auth } from '../../auth/auth';

@Injectable()
export class UsersService {
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
          goal: UserGoal.SAVE_MORE,
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
      pref = this.preferenceRepo.create({ userId, goal: UserGoal.SAVE_MORE });
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

    // Delete all application data in one transaction
    await this.dataSource.transaction(async (em) => {
      await em.query(`DELETE FROM insights     WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM opportunities WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM transactions  WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM accounts      WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM preferences   WHERE "userId" = $1`, [user.id]);
      await em.query(`DELETE FROM users         WHERE id        = $1`, [user.id]);
    });

    // Remove from Better Auth — best-effort (auth tables cleaned via db cascade too)
    try {
      await (auth.api as any).deleteUser({ body: { userId: betterAuthId } });
    } catch {
      // Better Auth user removal is best-effort; app data already wiped above
    }
  }
}
