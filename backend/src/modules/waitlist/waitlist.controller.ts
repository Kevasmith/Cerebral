import {
  Controller, Post, Body, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry } from '../../entities/waitlist-entry.entity';

@Controller('waitlist')
export class WaitlistController {
  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly repo: Repository<WaitlistEntry>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async join(@Body('email') email: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Valid email required');
    }
    // Unique constraint violation (already on list) treated as success
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(WaitlistEntry)
      .values({ email: email.toLowerCase().trim() })
      .orIgnore()
      .execute();

    return { success: true };
  }
}
