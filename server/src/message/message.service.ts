import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { ConversationService } from '../conversations/conversation.service';
import { ConversationDocument } from '../conversations/conversation.schema';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private conversationService: ConversationService,
  ) {}

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
    },
  ): Promise<Message> {
    const { content = '', type = 'text', mediaUrl = '' } = messageData;
    const message = new this.messageModel({
      senderId: new Types.ObjectId(senderId),
      conversationId: new Types.ObjectId(conversationId),
      content,
      type,
      mediaUrl,
    });
    return message.save();
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

  async getMessagesByConversationId(conversationId: string) {
    return this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 });
  }

  async getUserConversations(userId: string) {
    return this.conversationService.getUserConversations(userId);
  }
}
