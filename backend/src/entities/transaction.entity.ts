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

  @Column()
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

  @Column({ nullable: true })
  merchantName: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Account, (account) => account.transactions)
  @JoinColumn({ name: 'accountId' })
  account: Account;
}
