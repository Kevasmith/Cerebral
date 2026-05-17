import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';
import { encryptedTransformer } from '../common/crypto/column-encryption';

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT = 'credit',
  INVESTMENT = 'investment',
}

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  // Which aggregator linked this account.
  // Default 'flinks' covers all rows that pre-date the Plaid integration.
  @Column({ type: 'varchar', length: 16, default: 'flinks' })
  provider: 'flinks' | 'plaid';

  @Column({ type: 'varchar', nullable: true })
  flinksAccountId: string | null;

  // Plaid-only identifiers. plaidAccessToken is encrypted at rest because
  // it's a long-lived credential.
  @Column({ type: 'varchar', nullable: true })
  plaidAccountId: string | null;

  @Column({ type: 'varchar', nullable: true })
  plaidItemId: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedTransformer })
  plaidAccessToken: string | null;

  @Column({ type: 'text', nullable: true })
  plaidTxCursor: string | null;

  @Column({ transformer: encryptedTransformer })
  institutionName: string;

  @Column({ transformer: encryptedTransformer })
  accountName: string;

  // Optional user-defined label, e.g. "Joint chequing" or "Travel card".
  // Encrypted at rest to match the rest of the account-identity columns.
  @Column({ type: 'varchar', nullable: true, transformer: encryptedTransformer })
  nickname: string | null;

  @Column({ type: 'enum', enum: AccountType })
  accountType: AccountType;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 3, default: 'CAD' })
  currency: string;

  @Column({ nullable: true })
  lastSyncedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.accounts)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.account)
  transactions: Transaction[];
}
