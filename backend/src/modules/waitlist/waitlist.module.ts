import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistEntry } from '../../entities/waitlist-entry.entity';
import { WaitlistController } from './waitlist.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([WaitlistEntry]), MailModule],
  controllers: [WaitlistController],
})
export class WaitlistModule {}
