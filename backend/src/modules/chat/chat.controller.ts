import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatMessageDto } from './dto/chat-message.dto';

@Controller('chat')
@UseGuards(FirebaseAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async postMessage(
    @CurrentUser() user: { uid: string },
    @Body() dto: ChatMessageDto,
  ) {
    const reply = await this.chatService.ask(user.uid, dto.message);
    return { reply };
  }
}
