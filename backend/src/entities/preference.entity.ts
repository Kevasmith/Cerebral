import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { encryptedTransformer } from '../common/crypto/column-encryption';

export enum UserGoal {
  SAVE_FOR_HOUSE  = 'save_for_house',
  RETIRE_EARLY    = 'retire_early',
  OPTIMIZE_TAXES  = 'optimize_taxes',
  EMERGENCY_FUND  = 'emergency_fund',
  CUSTOM          = 'custom',
  // kept for backward compat with existing rows
  SAVE_MORE       = 'save_more',
  MAKE_MORE       = 'make_more',
  LEARN_INVESTING = 'learn_investing',
}

export enum UserInterest {
  INVESTING = 'investing',
  SIDE_INCOME = 'side_income',
  NETWORKING = 'networking',
  SAVING = 'saving',
}

@Entity('preferences')
export class Preference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: UserGoal, nullable: true, default: null })
  goal: UserGoal | null;

  @Column({ type: 'simple-array', nullable: true })
  interests: UserInterest[];

  @Column({ nullable: true, transformer: encryptedTransformer })
  location: string;

  @Column({ default: true })
  notificationsEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  notificationPreferences: Record<string, boolean>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.preference)
  @JoinColumn({ name: 'userId' })
  user: User;
}
