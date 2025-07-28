import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserConversationDocument = UserConversation & Document;

@Schema({ timestamps: true })
export class UserConversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean; // User đã xóa conversation này

  @Prop({ type: Date })
  lastDeletedAt?: Date; // Thời điểm user xóa conversation

  @Prop({ type: Boolean, default: false })
  isPinned: boolean; // User đã pin conversation này

  @Prop({ type: Boolean, default: false })
  isMuted: boolean; // User đã mute conversation này

  @Prop({ type: Number, default: 0 })
  unreadCount: number; // Số tin nhắn chưa đọc của user này

  @Prop({ type: Date })
  lastReadAt?: Date; // Thời điểm user đọc tin nhắn cuối cùng
}

export const UserConversationSchema =
  SchemaFactory.createForClass(UserConversation);

// Compound index để đảm bảo unique
UserConversationSchema.index(
  { userId: 1, conversationId: 1 },
  { unique: true },
);
