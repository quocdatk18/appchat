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

  /**
   * Khởi tạo Socket server
   * @param server - Socket.IO server instance
   */
  afterInit(server: Server) {
    this.server = server;
    this.logger.log('🚀 Socket server initialized');
  }

  /**
   * Xử lý khi client kết nối
   * @param client - Socket client instance
   */
  handleConnection(client: Socket) {
    this.logger.log(`🟢 Client connected: ${client.id}`);

    // Join vào room chung ngay khi kết nối
    client.join('global');

    client.on('register', (userId: string) => {
      this.onlineUsers.set(userId, client);
      this.logger.log(`📌 User ${userId} registered with socket ${client.id}`);
    });
  }

  /**
   * Xử lý khi client ngắt kết nối
   * - Cập nhật trạng thái offline trong DB
   * - Broadcast cho các user khác biết user này offline
   * @param client - Socket client instance
   */
  async handleDisconnect(client: Socket) {
    this.logger.log(`🔴 Client disconnected: ${client.id}`);

    for (const [userId, socket] of this.onlineUsers.entries()) {
      if (socket.id === client.id) {
        this.onlineUsers.delete(userId);
        this.logger.log(`❌ Removed socket of user ${userId}`);

        // Cập nhật DB
        await this.userService.updateStatus(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        // Broadcast cho tất cả user khác
        this.server.to('global').emit('user_status_changed', {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });

        break;
      }
    }
  }

  /**
   * Xử lý khi user kết nối (login)
   * - Lưu socket vào onlineUsers map
   * - Cập nhật trạng thái online trong DB
   * - Broadcast cho các user khác biết user này online
   * @param client - Socket client instance
   * @param userId - ID của user vừa kết nối
   */
  @SubscribeMessage('user_connected')
  async handleUserConnected(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: string,
  ) {
    this.onlineUsers.set(userId, client);
    client.join(userId); // Join vào room là userId (nếu cần)
    client.join('global'); // Join vào room chung để nhận status updates

    // Cập nhật DB
    await this.userService.updateStatus(userId, {
      isOnline: true,
      lastSeen: new Date(),
    });

    // Broadcast cho tất cả user khác
    this.server.to('global').emit('user_status_changed', {
      userId,
      isOnline: true,
      lastSeen: new Date(),
    });
  }

  /**
   * Xử lý khi user join vào một conversation
   * - Cho phép user nhận tin nhắn realtime từ conversation này
   * @param conversationId - ID của conversation
   * @param client - Socket client instance
   */
  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
  }

  /**
   * Xử lý request status của user
   * - Trả về status hiện tại của user được yêu cầu
   * @param userId - ID của user cần lấy status
   * @param client - Socket client instance
   */
  @SubscribeMessage('request_user_status')
  async handleRequestUserStatus(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const user = await this.userService.findById(userId);
      if (user) {
        client.emit('user_status_response', {
          userId,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        });
      }
    } catch (error) {
      this.logger.error(`Error getting user status for ${userId}:`, error);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody()
    payload: {
      fromUserId: string;
      receiverId: string;
      conversationId?: string; // Thêm conversationId cho nhóm chat
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
      conversationId: providedConversationId,
      content,
      type = 'text',
      mediaUrl = '',
      mimetype = '',
      originalName = '',
    } = payload;

    if (!content && !mediaUrl) return; // Không gửi nếu không có nội dung hoặc media

    try {
      let conversation;
      let conversationId: string;

      if (providedConversationId) {
        // Nhóm chat: sử dụng conversationId có sẵn
        conversation = await this.conversationService.getConversationById(
          providedConversationId,
        );
        conversationId = providedConversationId;
      } else if (receiverId && receiverId.trim()) {
        // 1-1 chat: tìm hoặc tạo conversation
        conversation = await this.conversationService.findOneByMembers([
          fromUserId,
          receiverId,
        ]);
        if (!conversation) {
          conversation = await this.conversationService.createConversation(
            fromUserId,
            receiverId,
          );
        }
        conversationId = (conversation._id as Types.ObjectId).toString();
      } else {
        throw new Error('Invalid receiverId or conversationId');
      }

      const newMessage = await this.messageService.createWithConversationId(
        fromUserId,
        conversationId,
        { content, type, mediaUrl, mimetype, originalName },
      );

      // Populate thông tin sender để frontend có thể hiển thị tên
      const populatedMessage = await this.messageService.populateMessageSender(
        (newMessage as any)._id,
      );

      if (!populatedMessage) {
        throw new Error('Failed to populate message sender');
      }

      const fullPayload = {
        ...(populatedMessage as any)._doc,
        fromUserId,
        conversationId,
        content: populatedMessage.content,
        type: populatedMessage.type,
        mediaUrl: populatedMessage.mediaUrl,
        createdAt: (populatedMessage as any).createdAt || Date.now(),
      };

      // Emit đến room theo conversationId (tất cả thành viên đều nhận)
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
