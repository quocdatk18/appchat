import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  receiverId: string;

  @IsString()
  content?: string;

  @IsString()
  type?: 'text' | 'image' | 'file' | 'video';

  @IsString()
  mediaUrl?: string;
}
