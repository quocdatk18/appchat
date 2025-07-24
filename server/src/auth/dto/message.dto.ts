import { IsNotEmpty } from 'class-validator';

export class MessageDto {
  @IsNotEmpty()
  receiverId: string;

  @IsNotEmpty()
  content: string;

  sender?: string;
}
