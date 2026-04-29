import {
  Controller, Post, Body, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry } from '../../entities/waitlist-entry.entity';
import { MailService } from '../mail/mail.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly repo: Repository<WaitlistEntry>,
    private readonly mail: MailService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async join(@Body('email') email: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Valid email required');
    }

    const normalized = email.toLowerCase().trim();
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(WaitlistEntry)
      .values({ email: normalized })
      .orIgnore()
      .execute();

    // Only send emails on a new signup (not a duplicate)
    if (result.raw.length > 0 || result.identifiers.length > 0) {
      void this.mail.sendWaitlistConfirmation(normalized);
      void this.mail.sendWaitlistAdminNotification(normalized);
    }

    return { success: true };
  }
}
