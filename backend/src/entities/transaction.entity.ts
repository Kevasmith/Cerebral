import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { encryptedTransformer } from '../common/crypto/column-encryption';

export enum TransactionCategory {
  FOOD = 'food',
  TRANSPORT = 'transport',
  ENTERTAINMENT = 'entertainment',
  SHOPPING = 'shopping',
  BILLS = 'bills',
  HEALTH = 'health',
  TRAVEL = 'travel',
  INCOME = 'income',
  TRANSFER = 'transfer',
  OTHER = 'other',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  accountId: string;

  @Column({ nullable: true })
  flinksTransactionId: string;

  @Column({ type: 'varchar', nullable: true })
  plaidTransactionId: string | null;

  // Plaid `personal_finance_category.primary` raw value. Used as a fallback
  // hint when the merchant-pattern table doesn't match. The merchant pattern
  // still wins; this is a safety net so unknown merchants don't all collapse
  // to OTHER.
  @Column({ type: 'varchar', nullable: true })
  plaidPrimaryCategory: string | null;

  @Column({ default: false })
  pending: boolean;

  @Column({ transformer: encryptedTransformer })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: false })
  isDebit: boolean;

  @Index()
  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: TransactionCategory, default: TransactionCategory.OTHER })
  category: TransactionCategory;

  @Column({ type: 'varchar', length: 3, default: 'CAD' })
  currency: string;

  @Column({ nullable: true, transformer: encryptedTransformer })
  merchantName: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Account, (account) => account.transactions)
  @JoinColumn({ name: 'accountId' })
  account: Account;
}
