import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Account } from './account.entity';
import { Insight } from './insight.entity';
import { Preference } from './preference.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  firebaseUid: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ nullable: true })
  location: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Account, (account) => account.user)
  accounts: Account[];

  @OneToMany(() => Insight, (insight) => insight.user)
  insights: Insight[];

  @OneToOne(() => Preference, (preference) => preference.user)
  preference: Preference;
}
