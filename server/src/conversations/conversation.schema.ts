import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Boolean, default: false }) // false: 1-1, true: group
  isGroup: boolean;

  @Prop({ type: String, default: '' })
  name: string; // Tên nhóm (nếu là group)

  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  members: Types.ObjectId[]; // Thành viên

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId; // Người tạo nhóm

  @Prop({ type: String, default: '' })
  avatar: string; // Ảnh nhóm

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  admins: Types.ObjectId[]; // Admin nhóm (nếu là group)

  @Prop({ type: Boolean, default: true })
  isActive: boolean; // true: conversation đang hoạt động, false: đã bị xóa/ẩn (chỉ dùng cho group)

  @Prop({ type: Boolean, default: false })
  deleted: boolean;

  @Prop({ type: String, default: '' })
  lastMessage: string;

  @Prop({ type: String, default: 'text' })
  lastMessageType: string;

  @Prop({ type: String, default: '' })
  lastMessageSenderId: string;

  @Prop({ type: Map, of: Number, default: {} })
  unreadCount: Record<string, number>;

  @Prop({ type: Object, default: {} })
  deletedAt: Record<string, Date>;

  @Prop({ type: Date, default: null })
  deactivatedAt?: Date | null;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
