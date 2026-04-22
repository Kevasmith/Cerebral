import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AiModule } from '../ai/ai.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AiModule, AccountsModule, TransactionsModule, UsersModule],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
