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

  @Prop({ type: [String], default: [] })
  deletedBy: string[]; // userId đã xoá conversation này (ẩn với họ, không xoá vật lý)
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
