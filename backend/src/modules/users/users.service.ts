import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Preference, UserGoal } from '../../entities/preference.entity';
import { RegisterDto, UpdatePreferencesDto } from './dto/onboarding.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Preference)
    private readonly preferenceRepo: Repository<Preference>,
  ) {}

  // Called on first login — creates user + default preferences if not exists
  async upsertFromFirebase(
    firebaseUid: string,
    dto: RegisterDto,
  ): Promise<User> {
    let user = await this.userRepo.findOne({ where: { firebaseUid } });

    if (!user) {
      user = this.userRepo.create({
        firebaseUid,
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

  async findByFirebaseUid(firebaseUid: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { firebaseUid },
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

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<Preference> {
    let pref = await this.preferenceRepo.findOne({ where: { userId } });

    if (!pref) {
      pref = this.preferenceRepo.create({ userId, goal: UserGoal.SAVE_MORE });
    }

    Object.assign(pref, dto);
    return this.preferenceRepo.save(pref);
  }

  async updateProfile(
    firebaseUid: string,
    updates: Partial<Pick<User, 'displayName' | 'location'>>,
  ): Promise<User> {
    const user = await this.findByFirebaseUid(firebaseUid);
    Object.assign(user, updates);
    return this.userRepo.save(user);
  }
}
