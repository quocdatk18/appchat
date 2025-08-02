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
  Delete,
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

    // Tìm conversation hiện tại
    let conversation = await conversationService.findOneByMembers([
      senderId,
      receiverId,
    ]);

    // Nếu tìm thấy conversation, kiểm tra xem cả 2 user có xóa nó không
    if (conversation && conversation.deletedAt) {
      const senderDeleted = conversation.deletedAt[senderId];
      const receiverDeleted = conversation.deletedAt[receiverId];

      // Chỉ tạo conversation mới khi cả 2 user đều đã xóa
      if (senderDeleted && receiverDeleted) {
        conversation = null;
      } else if (senderDeleted) {
        // Chỉ sender xóa, receiver chưa xóa -> khôi phục cho sender
        await conversationService.restoreConversationForUser(
          conversation._id.toString(),
          senderId,
        );
      }
    }

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
    @Req() req: Request,
  ) {
    const userId = req.user?.['_id'];
    return this.messageService.getMessagesByConversationId(
      conversationId,
      userId,
    );
  }

  // Thu hồi message (ẩn cả 2 phía)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/recall')
  async recallMessage(@Param('id') id: string, @Req() req) {
    const userId = req.user._id;
    const result = await this.messageService.recallMessage(id, userId);

    // Chỉ emit socket event khi recall thành công
    if (result.success && result.data) {
      const messageGateway = this.messageService.getMessageGateway();
      if (messageGateway) {
        messageGateway.server
          .to(result.data.conversationId.toString())
          .emit('message_recalled', {
            messageId: id,
            conversationId: result.data.conversationId,
          });
      }
    }

    return result;
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

  // Xóa message cho tất cả user (soft delete - chỉ admin mới có quyền)
  @UseGuards(JwtAuthGuard)
  @Delete(':id/delete-for-all')
  async deleteMessageForAll(@Param('id') id: string, @Req() req) {
    const userId = req.user._id;
    const result = await this.messageService.deleteMessageForAll(id, userId);

    // Emit socket event để cập nhật realtime cho tất cả user
    if (result.success && result.data) {
      const messageGateway = this.messageService.getMessageGateway();
      if (messageGateway) {
        messageGateway.server
          .to(result.data.conversationId.toString())
          .emit('message_deleted_for_all', {
            messageId: id,
            conversationId: result.data.conversationId,
            userId: userId,
            deletedForAll: true,
            deletedForAllAt: result.data.deletedForAllAt,
            deletedForAllBy: result.data.deletedForAllBy,
          });
      }
    }

    return result;
  }

  // Đánh dấu message đã đọc (thêm userId vào seenBy)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/seen')
  async markMessageSeen(@Param('id') id: string, @Req() req) {
    const userId = req.user._id;
    return this.messageService.markMessageSeen(id, userId);
  }
}
