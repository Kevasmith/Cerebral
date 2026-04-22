import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Insight } from '../../entities/insight.entity';
import { InsightEngineService } from './insight-engine.service';

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Insight)
    private readonly insightRepo: Repository<Insight>,
    private readonly engine: InsightEngineService,
  ) {}

  // Run the engine then return all active insights for this user
  async refreshAndGetInsights(userId: string): Promise<Insight[]> {
    await this.engine.runForUser(userId);
    return this.getActiveInsights(userId);
  }

  async getActiveInsights(userId: string): Promise<Insight[]> {
    return this.insightRepo
      .createQueryBuilder('insight')
      .where('insight.userId = :userId', { userId })
      .andWhere('(insight.expiresAt IS NULL OR insight.expiresAt > NOW())')
      .orderBy('insight.createdAt', 'DESC')
      .getMany();
  }

  async markRead(insightId: string, userId: string): Promise<void> {
    await this.insightRepo.update(
      { id: insightId, userId },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.insightRepo.count({
      where: { userId, isRead: false },
    });
  }
}
