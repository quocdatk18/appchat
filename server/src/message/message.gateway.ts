import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { Logger } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { ConversationService } from '../conversations/conversation.service';
import { ConversationDocument } from '../conversations/conversation.schema';
import { Types } from 'mongoose';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessageGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('MessageGateway');
  private onlineUsers = new Map<string, Socket>();

  constructor(
    private readonly messageService: MessageService,
    private readonly userService: UserService,
    private readonly conversationService: ConversationService,
  ) {}

  server: Server;

  afterInit(server: Server) {
    this.server = server;
    this.logger.log('🚀 Socket server initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`🟢 Client connected: ${client.id}`);

    client.on('register', (userId: string) => {
      this.onlineUsers.set(userId, client);
      this.logger.log(`📌 User ${userId} registered with socket ${client.id}`);
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔴 Client disconnected: ${client.id}`);

    for (const [userId, socket] of this.onlineUsers.entries()) {
      if (socket.id === client.id) {
        this.onlineUsers.delete(userId);
        this.logger.log(`❌ Removed socket of user ${userId}`);

        // Cập nhật DB
        this.userService.updateStatus(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        break;
      }
    }
  }

  @SubscribeMessage('user_connected')
  handleUserConnected(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: string,
  ) {
    this.onlineUsers.set(userId, client);
    client.join(userId); // Join vào room là userId (nếu cần)
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody()
    payload: {
      fromUserId: string;
      receiverId: string;
      content?: string;
      type?: 'text' | 'image' | 'file' | 'video';
      mediaUrl?: string;
      mimetype?: string;
      originalName?: string;
    },
  ) {
    const {
      fromUserId,
      receiverId,
      content,
      type = 'text',
      mediaUrl = '',
      mimetype = '',
      originalName = '',
    } = payload;

    if (!content && !mediaUrl) return; // Không gửi nếu không có nội dung hoặc media

    try {
      let conversation = await this.conversationService.findOneByMembers([
        fromUserId,
        receiverId,
      ]);
      if (!conversation) {
        conversation = await this.conversationService.createConversation(
          fromUserId,
          receiverId,
        );
      }
      // Ép kiểu _id về Types.ObjectId để tránh lỗi linter
      const conversationId = (conversation._id as Types.ObjectId).toString();
      const newMessage = await this.messageService.createWithConversationId(
        fromUserId,
        conversationId,
        { content, type, mediaUrl, mimetype, originalName },
      );

      const fullPayload = {
        ...(newMessage as any)._doc,
        fromUserId,
        conversationId,
        content: newMessage.content,
        type: newMessage.type,
        mediaUrl: newMessage.mediaUrl,
        createdAt: (newMessage as any).createdAt || Date.now(),
      };

      // Emit đến room theo conversationId (tất cả thành viên đều nhận)
      console.log(fullPayload);
      this.server.to(conversationId).emit('receive_message', fullPayload);
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
    }
  }

  @SubscribeMessage('seen_message')
  async handleSeenMessage(
    @MessageBody()
    payload: { messageId: string; userId: string; conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { messageId, userId, conversationId } = payload;
    // Cập nhật seenBy ở DB
    await this.messageService.markMessageSeen(messageId, userId);
    // Broadcast cho các thành viên khác trong conversation
    this.server.to(conversationId).emit('message_seen', { messageId, userId });
  }
}
