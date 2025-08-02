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

    // Kiểm tra conversation có tồn tại và user có quyền gửi tin nhắn không
    const conversation =
      await this.conversationService.getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Kiểm tra user có trong conversation không
    const isMember = conversation.members.some((member) => {
      // Xử lý cả trường hợp member là ObjectId và User object (đã populate)
      let memberId;
      if (member._id) {
        // Member là User object (đã populate)
        memberId = member._id.toString();
      } else {
        // Member là ObjectId
        memberId = member.toString();
      }
      return memberId === senderId;
    });

    if (!isMember) {
      throw new Error('User is not a member of this conversation');
    }

    // Kiểm tra conversation có bị deactivated không
    if (conversation.deactivatedAt) {
      throw new Error('This conversation has been deactivated');
    }

    // Khôi phục conversation nếu sender đã xóa
    if (conversation.deletedAt && conversation.deletedAt[senderId]) {
      await this.conversationService.restoreConversationForUser(
        conversationId,
        senderId,
      );
    }

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
    let query: any = {
      conversationId: new Types.ObjectId(conversationId),
      deletedForAll: { $ne: true }, // Không lấy tin nhắn đã bị xóa cho tất cả
    };

    if (userId) {
      const conversation =
        await this.conversationService.getConversationById(conversationId);
      const deletedAt = conversation?.deletedAt?.[userId];
      if (deletedAt) query.createdAt = { $gt: deletedAt };
    }
    return this.messageModel
      .find(query)
      .sort({ createdAt: 1 })
      .populate('senderId', 'username avatar gender nickname email');
  }

  async getUserConversations(userId: string) {
    return this.conversationService.getUserConversations(userId);
  }

  // Thu hồi message (ẩn cả 2 phía) - Đơn giản hóa
  async recallMessage(id: string, userId: string) {
    // Kiểm tra message có tồn tại không
    const message = await this.messageModel.findById(id);
    if (!message) {
      return {
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND',
      };
    }

    // Kiểm tra đã thu hồi chưa
    if (message.recalled) {
      return {
        success: false,
        message: 'Message already recalled',
        code: 'MESSAGE_ALREADY_RECALLED',
      };
    }

    // Kiểm tra thời gian thu hồi (30 ngày như Zalo/Facebook)
    const messageTime = new Date((message as any).createdAt).getTime();
    const currentTime = new Date().getTime();
    const maxRecallTime = 30 * 24 * 60 * 60 * 1000; // 30 ngày

    if (currentTime - messageTime > maxRecallTime) {
      return {
        success: false,
        message: 'Cannot recall message older than 30 days',
        code: 'RECALL_TIME_EXPIRED',
      };
    }

    // Kiểm tra quyền thu hồi
    const isSender = message.senderId.toString() === userId;

    if (!isSender) {
      // Nếu không phải người gửi, kiểm tra xem có phải admin trong nhóm không
      const conversation = await this.conversationService.getConversationById(
        message.conversationId.toString(),
      );

      if (!conversation || !conversation.isGroup) {
        return {
          success: false,
          message: 'Only sender can recall message',
          code: 'UNAUTHORIZED',
        };
      }

      // Kiểm tra xem user có phải admin của nhóm không
      const isAdmin = conversation.createdBy?.toString() === userId;
      if (!isAdmin) {
        return {
          success: false,
          message: 'Only admin can recall messages from others in group',
          code: 'UNAUTHORIZED',
        };
      }
    }

    // Đánh dấu recalled, set recallAt = now
    const updatedMessage = await this.messageModel
      .findByIdAndUpdate(
        id,
        { recalled: true, recallAt: new Date() },
        { new: true },
      )
      .populate('senderId', 'username avatar gender nickname email');

    return {
      success: true,
      message: 'Message recalled successfully',
      data: updatedMessage,
    };
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

  // Xóa message cho tất cả user (soft delete - chỉ admin mới có quyền)
  async deleteMessageForAll(id: string, userId: string) {
    // Kiểm tra message có tồn tại không
    const message = await this.messageModel.findById(id);
    if (!message) {
      return {
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND',
      };
    }

    // Kiểm tra xem có phải admin trong nhóm không
    const conversation = await this.conversationService.getConversationById(
      message.conversationId.toString(),
    );
    if (!conversation || !conversation.isGroup) {
      return {
        success: false,
        message: 'Can only delete messages in group conversations',
        code: 'NOT_GROUP_CONVERSATION',
      };
    }

    const isAdmin = conversation.createdBy?.toString() === userId;
    if (!isAdmin) {
      return {
        success: false,
        message: 'Only admin can delete messages for all users',
        code: 'UNAUTHORIZED',
      };
    }

    // Kiểm tra đã xóa cho tất cả chưa
    if (message.deletedForAll) {
      return {
        success: false,
        message: 'Message already deleted for all users',
        code: 'MESSAGE_ALREADY_DELETED_FOR_ALL',
      };
    }

    // Soft delete cho tất cả user
    const updatedMessage = await this.messageModel
      .findByIdAndUpdate(
        id,
        {
          deletedForAll: true,
          deletedForAllAt: new Date(),
          deletedForAllBy: userId,
        },
        { new: true },
      )
      .populate('senderId', 'username avatar gender nickname email');

    return {
      success: true,
      message: 'Message deleted for all users',
      data: updatedMessage,
    };
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
