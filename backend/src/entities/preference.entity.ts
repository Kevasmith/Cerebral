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

export enum UserGoal {
  SAVE_MORE = 'save_more',
  MAKE_MORE = 'make_more',
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

  @Column({ type: 'enum', enum: UserGoal, default: UserGoal.SAVE_MORE })
  goal: UserGoal;

  @Column({ type: 'simple-array', nullable: true })
  interests: UserInterest[];

  @Column({ nullable: true })
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
