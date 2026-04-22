import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum InsightType {
  OVERSPENDING = 'overspending',
  IDLE_CASH = 'idle_cash',
  INCOME_TREND = 'income_trend',
  OPPORTUNITY = 'opportunity',
  SAVINGS_TIP = 'savings_tip',
}

@Entity('insights')
export class Insight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: InsightType })
  type: InsightType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.insights)
  @JoinColumn({ name: 'userId' })
  user: User;
}
