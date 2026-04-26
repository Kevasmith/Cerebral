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
import { encryptedTransformer } from '../common/crypto/column-encryption';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  betterAuthId: string;

  @Column({ transformer: encryptedTransformer })
  email: string;

  @Column({ nullable: true, transformer: encryptedTransformer })
  displayName: string;

  @Column({ nullable: true, transformer: encryptedTransformer })
  location: string;

  @Column({ nullable: true, transformer: encryptedTransformer })
  expoPushToken: string;

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
