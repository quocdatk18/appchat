import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // Gửi tin nhắn mới
  @Post()
  async sendMessage(@Req() req: Request, @Body() messageDto: CreateMessageDto) {
    const senderId = req.user?.['_id'];
    if (!senderId) {
      throw new UnauthorizedException('Unauthorized');
    }
    const { receiverId, content, type, mediaUrl } = messageDto;

    const conversationService = this.messageService.getConversationService();
    let conversation = await conversationService.findOneByMembers([
      senderId,
      receiverId,
    ]);
    if (!conversation) {
      conversation = await conversationService.createConversation(
        senderId,
        receiverId,
      );
    }
    return this.messageService.createWithConversationId(
      senderId,
      (conversation as any)._id.toString(),
      { content, type, mediaUrl },
    );
  }

  // Lấy tin nhắn theo cuộc trò chuyện
  @Get('conversation/:conversationId')
  async getMessagesByConversationId(
    @Param('conversationId') conversationId: string,
  ) {
    return this.messageService.getMessagesByConversationId(conversationId);
  }
}
