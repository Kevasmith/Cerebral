import { Module } from '@nestjs/common';
import { FlinksService } from './flinks.service';

@Module({
  providers: [FlinksService],
  exports: [FlinksService],
})
export class FlinksModule {}
