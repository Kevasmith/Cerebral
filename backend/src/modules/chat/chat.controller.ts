import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatMessageDto } from './dto/chat-message.dto';

@Controller('chat')
@UseGuards(FirebaseAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 10 messages per minute per IP — protects OpenAI spend
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  @Post()
  async postMessage(
    @CurrentUser() user: { uid: string },
    @Body() dto: ChatMessageDto,
  ) {
    const reply = await this.chatService.ask(user.uid, dto.message);
    return { reply };
  }
}
