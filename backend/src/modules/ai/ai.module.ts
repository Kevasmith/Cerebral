import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { SkillLoaderService } from './skill-loader.service';

@Module({
  providers: [SkillLoaderService, AiService],
  exports: [AiService, SkillLoaderService],
})
export class AiModule {}
