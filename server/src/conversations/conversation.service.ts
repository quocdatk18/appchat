import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './conversation.schema';
import { User, UserDocument } from 'src/user/user.schema';
import { Message, MessageDocument } from 'src/message/message.schema';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  // 🧩 Tạo cuộc trò chuyện mới (1-1 hoặc nhóm)
  async createConversation(
    userId: string,
    receiverId: string | string[],
    isGroup = false,
    groupName = '',
    content?: string,
    type: string = 'text',
    mediaUrl: string = '',
  ): Promise<ConversationDocument> {
    if (!isGroup) {
      // Sửa: convert userId và receiverId sang ObjectId để members luôn là ObjectId
      const userObjId = new Types.ObjectId(userId);
      const receiverObjId = new Types.ObjectId(receiverId as string);
      // Kiểm tra nếu đã có cuộc trò chuyện 1-1 giữa 2 người (chỉ đúng 2 thành viên, không phải group)
      const existing = await this.conversationModel.findOne({
        isGroup: false,
        members: { $all: [userObjId, receiverObjId] },
        $expr: { $eq: [{ $size: '$members' }, 2] },
      });
      if (existing) return existing;

      // Tạo cuộc trò chuyện 1-1 mới nếu chưa có
      const newConversation = await new this.conversationModel({
        isGroup: false,
        members: [userObjId, receiverObjId],
        createdBy: userObjId,
      }).save();

      // Tạo message đầu tiên nếu có content hoặc mediaUrl
      if (content || mediaUrl) {
        await this.messageModel.create({
          conversationId: newConversation._id,
          senderId: userObjId,
          content,
          type,
          mediaUrl,
        });
      }

      return newConversation;
    }

    // 🧑‍🤝‍🧑 Tạo nhóm
    const receivers = Array.isArray(receiverId) ? receiverId : [receiverId];
    const allMembers = [...new Set([userId, ...receivers])]; // Loại bỏ trùng
    if (allMembers.length < 3) {
      throw new Error('Nhóm phải có ít nhất 3 người');
    }

    const groupConversation = new this.conversationModel({
      isGroup: true,
      name: groupName || 'Nhóm không tên',
      members: allMembers,
      createdBy: userId,
    });

    return groupConversation.save();
  }

  // Lấy danh sách các đoạn chat của user (sidebar, hỗ trợ cả nhóm)
  async getUserConversations(userId: string): Promise<any[]> {
    const conversations = await this.conversationModel.aggregate([
      { $match: { members: { $in: [new Types.ObjectId(userId)] } } },
      { $sort: { updatedAt: -1 } },
      // Lấy last message
      {
        $lookup: {
          from: 'messages',
          let: { convId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$conversationId', '$$convId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'lastMessage',
        },
      },
      { $unwind: { path: '$lastMessage', preserveNullAndEmptyArrays: true } },
      // Lấy thông tin receiver (người còn lại) cho 1-1
      {
        $addFields: {
          receiverId: {
            $cond: [
              { $eq: ['$isGroup', false] },
              {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$members',
                      as: 'member',
                      cond: { $ne: ['$$member', new Types.ObjectId(userId)] },
                    },
                  },
                  0,
                ],
              },
              null,
            ],
          },
        },
      },
      // Lấy thông tin receiver cho 1-1
      {
        $lookup: {
          from: 'users',
          localField: 'receiverId',
          foreignField: '_id',
          as: 'receiver',
        },
      },
      { $unwind: { path: '$receiver', preserveNullAndEmptyArrays: true } },
      // Lấy preview members cho nhóm
      {
        $lookup: {
          from: 'users',
          localField: 'members',
          foreignField: '_id',
          as: 'memberPreviews',
        },
      },
      // Chỉ lấy các trường cần thiết
      {
        $project: {
          _id: 1,
          isGroup: 1,
          name: 1,
          avatar: 1,
          receiver: { _id: 1, username: 1, avatar: 1 }, // chỉ cho 1-1
          members: 1,
          memberPreviews: { _id: 1, username: 1, avatar: 1 }, // preview cho nhóm
          lastMessage: '$lastMessage.content',
          updatedAt: 1,
        },
      },
    ]);
    return conversations;
  }

  async findOneByMembers(userIds: string[]): Promise<any> {
    const objIds = userIds.map((id) => new Types.ObjectId(id));
    const result = await this.conversationModel.findOne({
      isGroup: false,
      members: { $all: objIds, $size: 2 },
    });
    return result;
  }

  // ✅ Lấy chi tiết một đoạn chat
  async getConversationById(id: string): Promise<Conversation> {
    const conv = await this.conversationModel
      .findById(id)
      .populate('members', 'username avatar email');
    if (!conv) throw new NotFoundException('Không tìm thấy đoạn chat');
    return conv;
  }

  // Xóa cuộc trò chuyện theo id
  async deleteConversation(
    conversationId: string,
  ): Promise<{ deleted: boolean }> {
    const result = await this.conversationModel.deleteOne({
      _id: conversationId,
    });
    return { deleted: result.deletedCount === 1 };
  }

  // Tìm kiếm hội thoại theo tên hoặc username thành viên
  async searchConversation(userId: string, query: string): Promise<any[]> {
    const conversations = await this.conversationModel.aggregate([
      { $match: { members: { $in: [new Types.ObjectId(userId)] } } },
      {
        $lookup: {
          from: 'users',
          localField: 'members',
          foreignField: '_id',
          as: 'memberPreviews',
        },
      },
      // Thêm trường otherMembers: loại bỏ chính bạn
      {
        $addFields: {
          otherMembers: {
            $filter: {
              input: '$memberPreviews',
              as: 'member',
              cond: { $ne: ['$$member._id', new Types.ObjectId(userId)] },
            },
          },
        },
      },
      // Lọc theo tên nhóm hoặc username của thành viên khác
      {
        $match: {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { 'otherMembers.username': { $regex: query, $options: 'i' } },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          isGroup: 1,
          name: 1,
          avatar: 1,
          members: 1,
          memberPreviews: { _id: 1, username: 1, avatar: 1 },
          updatedAt: 1,
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);
    return conversations;
  }
}
// tìm kiếm đoạn chat
