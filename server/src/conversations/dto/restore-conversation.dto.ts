import { IsNotEmpty, IsString } from 'class-validator';

export class RestoreConversationDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
