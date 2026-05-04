import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { BetterAuthGuard } from '../../common/guards/better-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatMessageDto } from './dto/chat-message.dto';
import { posthog } from '../../posthog';

@Controller('chat')
@UseGuards(BetterAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 10 messages per minute per IP — protects OpenAI spend
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  @Post()
  async postMessage(
    @CurrentUser() user: { id: string },
    @Body() dto: ChatMessageDto,
  ) {
    const reply = await this.chatService.ask(user.id, dto.message);
    posthog.capture({
      distinctId: user.id,
      event: 'chat_message_sent',
      properties: { message_length: dto.message.length },
    });
    return { reply };
  }
}
