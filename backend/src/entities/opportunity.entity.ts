import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OpportunityType {
  GIG = 'gig',
  EVENT = 'event',
  SIDE_HUSTLE = 'side_hustle',
  INVESTMENT_EXPLAINER = 'investment_explainer',
  NETWORKING = 'networking',
}

export enum OpportunityAction {
  LEARN_MORE = 'learn_more',
  ATTEND = 'attend',
  EXPLORE = 'explore',
}

@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: OpportunityType })
  type: OpportunityType;

  @Column({ type: 'enum', enum: OpportunityAction, default: OpportunityAction.LEARN_MORE })
  actionType: OpportunityAction;

  @Column({ nullable: true })
  actionUrl: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
