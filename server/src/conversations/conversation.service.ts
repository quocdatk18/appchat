import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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

      // Chỉ tạo conversation khi có content hoặc mediaUrl
      if (!content && !mediaUrl) {
        throw new BadRequestException('Không thể tạo cuộc trò chuyện rỗng');
      }

      // Tạo cuộc trò chuyện 1-1 mới nếu chưa có
      const newConversation = await new this.conversationModel({
        isGroup: false,
        members: [userObjId, receiverObjId],
        createdBy: userObjId,
      }).save();

      // Tạo message đầu tiên
      await this.messageModel.create({
        conversationId: newConversation._id,
        senderId: userObjId,
        content,
        type,
        mediaUrl,
      });

      return newConversation;
    }

    // 🧑‍🤝‍🧑 Tạo nhóm
    const receivers = Array.isArray(receiverId) ? receiverId : [receiverId];
    const allMembers = [...new Set([userId, ...receivers])]; // Loại bỏ trùng

    if (allMembers.length < 3) {
      throw new Error('Nhóm phải có ít nhất 3 người');
    }

    if (!groupName || !groupName.trim()) {
      throw new Error('Tên nhóm không được để trống');
    }

    // Chỉ tạo group khi có content hoặc mediaUrl
    if (!content && !mediaUrl) {
      throw new BadRequestException('Không thể tạo nhóm rỗng');
    }

    const groupConversation = new this.conversationModel({
      isGroup: true,
      name: groupName,
      avatar: mediaUrl || '', // Lưu avatar từ mediaUrl
      members: allMembers.map((id) => new Types.ObjectId(id)),
      createdBy: new Types.ObjectId(userId),
    });

    const savedGroup = await groupConversation.save();

    // Tạo message đầu tiên cho group
    await this.messageModel.create({
      conversationId: savedGroup._id,
      senderId: new Types.ObjectId(userId),
      content,
      type,
      mediaUrl,
    });

    return savedGroup;
  }

  // Lấy danh sách các đoạn chat của user (sidebar, hỗ trợ cả nhóm)
  async getUserConversations(userId: string): Promise<any[]> {
    const conversations = await this.conversationModel.aggregate([
      {
        $match: {
          members: { $in: [new Types.ObjectId(userId)] },
          // Loại bỏ conversations mà user đã xóa
          $or: [
            { deletedBy: { $exists: false } },
            { deletedBy: { $nin: [userId] } },
          ],
          // Loại bỏ nhóm đã bị ẩn với tất cả thành viên
          hiddenFromAll: { $ne: true },
        },
      },
      { $sort: { updatedAt: -1 } },
      // Lấy last message (sử dụng trường có sẵn thay vì lookup)
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
          createdBy: 1, // Thêm createdBy
          receiver: {
            _id: 1,
            username: 1,
            avatar: 1,
            nickname: 1,
            email: 1,
            gender: 1,
          }, // thêm email và gender
          members: 1,
          memberPreviews: {
            _id: 1,
            username: 1,
            avatar: 1,
            nickname: 1,
            email: 1,
            gender: 1,
          }, // thêm email và gender
          lastMessage: '$lastMessage',
          lastMessageType: '$lastMessageType',
          lastMessageSenderId: '$lastMessageSenderId',
          updatedAt: 1,
          unreadCount: 1,
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
      .populate('members', 'username avatar email isOnline');
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

  // Xoá conversation phía 1 user (ẩn với họ, không xoá vật lý)
  async deleteConversationForUser(conversationId: string, userId: string) {
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: { deletedBy: userId },
        $pull: { members: userId }, // Xóa user khỏi members để không nhận tin nhắn nữa
      },
      { new: true },
    );
  }

  // Ẩn nhóm với tất cả thành viên (soft delete - chỉ admin mới được)
  async hideGroupFromAllMembers(conversationId: string, userId: string) {
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy nhóm');
    }

    if (!conversation.isGroup) {
      throw new BadRequestException('Chỉ có thể ẩn nhóm chat');
    }

    // Kiểm tra quyền admin
    if (conversation.createdBy?.toString() !== userId) {
      throw new ForbiddenException('Chỉ quản trị viên mới có thể ẩn nhóm');
    }

    // Ẩn nhóm với tất cả thành viên (soft delete)
    const result = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          hiddenFromAll: true,
          hiddenAt: new Date(),
        },
      },
      { new: true },
    );

    return {
      hidden: true,
      message: 'Đã ẩn nhóm với tất cả thành viên',
    };
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

  // Tìm conversation theo name (admin)
  async searchConversationsByName(
    name: string,
  ): Promise<{ _id: string; name: string; createdBy: string | null }[]> {
    const conversations = await this.conversationModel.find({
      name: { $regex: name, $options: 'i' },
    });
    return conversations.map((c) => ({
      _id: String(c._id),
      name: c.name,
      createdBy: c.createdBy ? String(c.createdBy) : null,
    }));
  }

  // Cập nhật lastMessage cho conversation
  async updateLastMessage(
    conversationId: string,
    content: string,
    type: string,
    senderId: string,
  ) {
    return this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          lastMessage: content,
          lastMessageType: type,
          lastMessageSenderId: senderId,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );
  }

  // Tăng unreadCount cho tất cả thành viên trừ sender
  async incrementUnreadCount(conversationId: string, senderId: string) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) return;

    const updateData: any = {};
    conversation.members.forEach((memberId) => {
      const memberIdStr = memberId.toString();
      if (memberIdStr !== senderId) {
        const currentCount = conversation.unreadCount?.get(memberIdStr) || 0;
        const newCount = currentCount + 1;
        updateData[`unreadCount.${memberIdStr}`] = newCount;
      }
    });

    const result = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      { $set: updateData },
      { new: true },
    );

    return result;
  }

  // Reset unreadCount cho một user
  async resetUnreadCount(conversationId: string, userId: string) {
    const result = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      { $set: { [`unreadCount.${userId}`]: 0 } },
      { new: true },
    );

    return result;
  }

  // Thêm thành viên vào nhóm
  async addMembersToGroup(
    conversationId: string,
    memberIds: string[],
    userId: string,
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy nhóm');
    }

    if (!conversation.isGroup) {
      throw new Error('Chỉ có thể thêm thành viên vào nhóm');
    }

    if (conversation.createdBy.toString() !== userId) {
      throw new Error('Chỉ người tạo nhóm mới được thêm thành viên');
    }

    // Thêm thành viên mới
    const newMembers = memberIds.map((id) => new Types.ObjectId(id));
    const updatedConversation = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: { members: { $each: newMembers } },
        $pull: { deletedBy: { $in: memberIds } }, // Xóa khỏi deletedBy nếu có
      },
      { new: true },
    );

    return updatedConversation;
  }

  // Cập nhật thông tin nhóm (chỉ người tạo mới được)
  async updateGroup(
    conversationId: string,
    updateData: { name?: string; avatar?: string },
    userId: string,
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy nhóm');
    }

    if (!conversation.isGroup) {
      throw new Error('Chỉ có thể cập nhật thông tin nhóm');
    }

    if (conversation.createdBy.toString() !== userId) {
      throw new Error('Chỉ người tạo nhóm mới được cập nhật thông tin');
    }

    const updatedConversation = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      { $set: updateData },
      { new: true },
    );

    return updatedConversation;
  }

  // Xóa thành viên khỏi nhóm
  async removeMembersFromGroup(
    conversationId: string,
    memberIds: string[],
    userId: string,
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy nhóm');
    }

    if (!conversation.isGroup) {
      throw new Error('Chỉ có thể xóa thành viên khỏi nhóm');
    }

    if (conversation.createdBy.toString() !== userId) {
      throw new Error('Chỉ người tạo nhóm mới được xóa thành viên');
    }

    // Xóa thành viên khỏi nhóm
    const memberObjectIds = memberIds.map((id) => new Types.ObjectId(id));
    const updatedConversation = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        $pull: { members: { $in: memberObjectIds } },
        $addToSet: { deletedBy: { $each: memberIds } }, // Thêm vào deletedBy để ẩn với họ
      },
      { new: true },
    );

    return updatedConversation;
  }

  // Lấy thông tin chi tiết nhóm
  async getGroupInfo(conversationId: string, userId: string) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy nhóm');
    }

    if (!conversation.isGroup) {
      throw new Error('Chỉ có thể xem thông tin nhóm');
    }

    // Kiểm tra user có trong nhóm không
    if (!conversation.members.includes(new Types.ObjectId(userId))) {
      throw new Error('Bạn không phải thành viên nhóm này');
    }

    // Lấy thông tin chi tiết các thành viên
    const memberDetails = await this.userModel.find(
      { _id: { $in: conversation.members } },
      'username nickname avatar email',
    );

    return {
      _id: conversation._id,
      name: conversation.name,
      avatar: conversation.avatar,
      createdBy: conversation.createdBy,
      members: memberDetails,
      memberCount: conversation.members.length,
      createdAt: (conversation as any).createdAt,
      updatedAt: (conversation as any).updatedAt,
    };
  }

  // Phục hồi conversation (admin)
  async restoreConversation(conversationId: string): Promise<boolean> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (!conversation.deleted) return true; // Đã active
    conversation.deleted = false;
    await conversation.save();
    return true;
  }
}
// tìm kiếm đoạn chat
