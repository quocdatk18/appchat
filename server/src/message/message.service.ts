import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { ConversationService } from '../conversations/conversation.service';
import { ConversationDocument } from '../conversations/conversation.schema';
import { MessageGateway } from './message.gateway';

@Injectable()
export class MessageService {
  private messageGateway: MessageGateway | null = null;

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private conversationService: ConversationService,
  ) {}

  setMessageGateway(gateway: MessageGateway) {
    this.messageGateway = gateway;
  }

  getMessageGateway(): MessageGateway | null {
    return this.messageGateway;
  }

  getConversationService() {
    return this.conversationService;
  }

  async create(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    // Hàm này giữ lại cho tương thích cũ, không dùng conversationId nữa
    const { content = '', type = 'text', mediaUrl = '' } = createMessageDto;
    // Cần truyền conversationId trực tiếp ở hàm createWithConversationId
    throw new Error('Use createWithConversationId instead');
  }

  async createWithConversationId(
    senderId: string,
    conversationId: string,
    messageData: {
      content?: string;
      type?: 'text' | 'image' | 'file' | 'video';
      mediaUrl?: string;
      mimetype?: string;
      originalName?: string;
    },
  ): Promise<Message> {
    const {
      content = '',
      type = 'text',
      mediaUrl = '',
      mimetype = '',
      originalName = '',
    } = messageData;
    const message = new this.messageModel({
      senderId: new Types.ObjectId(senderId),
      conversationId: new Types.ObjectId(conversationId),
      content,
      type,
      mediaUrl,
      mimetype,
      originalName,
    });
    const savedMessage = await message.save();

    // Chỉ cập nhật conversation với lastMessage mới nếu có content
    if (content.trim()) {
      await this.conversationService.updateLastMessage(
        conversationId,
        content,
        type,
        senderId,
      );
      // Tăng unreadCount cho tất cả thành viên trừ sender
      await this.conversationService.incrementUnreadCount(
        conversationId,
        senderId,
      );
    }

    return savedMessage;
  }

  async getConversations(userId: string) {
    const objectId = new Types.ObjectId(userId);

    const conversations = await this.messageModel.aggregate([
      {
        $match: {
          $or: [{ senderId: objectId }, { receiverId: objectId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', objectId] },
              '$receiverId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: '$lastMessage._id',
          userId: '$user._id',
          username: '$user.username',
          avatar: '$user.avatar',
          content: '$lastMessage.content',
          createdAt: '$lastMessage.createdAt',
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return conversations;
  }

  // Get all messages for a user, including group messages
  async getAllMessagesForUser(userId: string) {
    // Get all conversations (1-1 and group) for the user
    const conversations = (await this.conversationService.getUserConversations(
      userId,
    )) as ConversationDocument[];
    const conversationIds = conversations.map((conv) => conv._id);
    // Get all messages in these conversations
    const messages = await this.messageModel
      .find({
        conversationId: { $in: conversationIds },
      })
      .sort({ createdAt: 1 });
    return messages;
  }

  async getMessagesByConversationId(conversationId: string, userId?: string) {
    let query: any = { conversationId: new Types.ObjectId(conversationId) };

    // Nếu có userId, check UserConversation để lấy lastDeletedAt
    if (userId) {
      const userConversation =
        await this.conversationService.getUserConversation(
          userId,
          conversationId,
        );

      // Nếu user đã xóa conversation và có lastDeletedAt
      if (userConversation?.isDeleted && userConversation?.lastDeletedAt) {
        // Chỉ lấy tin nhắn từ sau thời điểm xóa
        query.createdAt = { $gt: userConversation.lastDeletedAt };
      }
    }

    return this.messageModel
      .find(query)
      .sort({ createdAt: 1 })
      .populate('senderId', 'username avatar gender nickname email');
  }

  async getUserConversations(userId: string) {
    return this.conversationService.getUserConversations(userId);
  }

  // Thu hồi message (ẩn cả 2 phía)
  async recallMessage(id: string, userId: string) {
    // Kiểm tra message có tồn tại không
    const message = await this.messageModel.findById(id);
    if (!message) {
      throw new Error('Message not found');
    }

    // Kiểm tra người gửi
    if (message.senderId.toString() !== userId) {
      throw new Error('Only sender can recall message');
    }

    // Thiết lập thời gian được thu hồi
    const messageTime = new Date((message as any).createdAt).getTime();
    const currentTime = new Date().getTime();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (currentTime - messageTime > fiveMinutes) {
      throw new Error('Cannot recall message after 5 minutes');
    }

    // Kiểm tra đã thu hồi chưa
    if (message.recalled) {
      throw new Error('Message already recalled');
    }

    // Đánh dấu recalled, set recallAt = now
    return this.messageModel
      .findByIdAndUpdate(
        id,
        { recalled: true, recallAt: new Date() },
        { new: true },
      )
      .populate('senderId', 'username avatar gender nickname email');
  }

  // Xoá message phía người gửi (chỉ ẩn phía họ)
  async deleteMessageForUser(id: string, userId: string) {
    return this.messageModel
      .findByIdAndUpdate(
        id,
        { $addToSet: { deletedBy: userId } },
        { new: true },
      )
      .populate('senderId', 'username avatar gender nickname email');
  }

  // Đánh dấu message đã đọc (thêm userId vào seenBy)
  async markMessageSeen(id: string, userId: string) {
    return this.messageModel.findByIdAndUpdate(
      id,
      { $addToSet: { seenBy: userId } },
      { new: true },
    );
  }

  // Populate thông tin sender cho message
  async populateMessageSender(messageId: string) {
    return this.messageModel
      .findById(messageId)
      .populate('senderId', 'username avatar gender nickname email');
  }
}
