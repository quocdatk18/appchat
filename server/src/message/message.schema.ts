import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: String, default: '' })
  content: string;

  @Prop({
    type: String,
    enum: ['text', 'image', 'file', 'video'],
    default: 'text',
  })
  type: string; // Hỗ trợ media

  @Prop({ type: String, default: '' })
  mediaUrl: string; // Link file/media nếu có

  @Prop({ type: String, default: '' })
  mimetype: string; // Loại file thực tế (image/png, video/mp4, ...)

  @Prop({ type: String, default: '' })
  originalName: string; // Tên file gốc

  @Prop({ type: [String], default: [] })
  deletedBy: string[]; // userId đã xoá message này (chỉ ẩn phía họ)

  @Prop({ type: [String], default: [] })
  seenBy: string[]; // userId đã xem message này

  @Prop({ type: Boolean, default: false })
  recalled: boolean; // true nếu đã thu hồi (ẩn cả 2 phía, sẽ xoá vật lý sau N phút)

  @Prop({ type: Date, default: null })
  recallAt: Date; // thời điểm thu hồi, dùng cho cron xoá vật lý
}

export const MessageSchema = SchemaFactory.createForClass(Message);
