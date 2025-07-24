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

  @Prop({ type: String, enum: ['text', 'image', 'file', 'video'], default: 'text' })
  type: string; // Hỗ trợ media

  @Prop({ type: String, default: '' }) 
  mediaUrl: string; // Link file/media nếu có

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean; // Hỗ trợ thu hồi/xóa

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  seenBy: Types.ObjectId[]; // Ai đã đọc
}

export const MessageSchema = SchemaFactory.createForClass(Message);
