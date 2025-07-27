import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
  Patch,
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

  // Thu hồi message (ẩn cả 2 phía)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/recall')
  async recallMessage(@Param('id') id: string, @Req() req) {
    const userId = req.user._id;
    const updatedMessage = await this.messageService.recallMessage(id, userId);

    // Emit socket event để cập nhật realtime
    const messageGateway = this.messageService.getMessageGateway();
    if (messageGateway && updatedMessage) {
      messageGateway.server
        .to(updatedMessage.conversationId.toString())
        .emit('message_recalled', {
          messageId: id,
          conversationId: updatedMessage.conversationId,
        });
    }

    return updatedMessage;
  }

  // Xoá message phía người gửi (chỉ ẩn phía họ)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/delete')
  async deleteMessageForUser(@Param('id') id: string, @Req() req) {
    const userId = req.user._id;
    const updatedMessage = await this.messageService.deleteMessageForUser(
      id,
      userId,
    );

    // Emit socket event để cập nhật realtime
    const messageGateway = this.messageService.getMessageGateway();
    if (messageGateway && updatedMessage) {
      messageGateway.server
        .to(updatedMessage.conversationId.toString())
        .emit('message_deleted', {
          messageId: id,
          conversationId: updatedMessage.conversationId,
          userId: userId,
        });
    }

    return updatedMessage;
  }

  // Đánh dấu message đã đọc (thêm userId vào seenBy)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/seen')
  async markMessageSeen(@Param('id') id: string, @Req() req) {
    const userId = req.user._id;
    return this.messageService.markMessageSeen(id, userId);
  }
}
