import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SupportRequestDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @IsString()
  @IsNotEmpty()
  username: string;
}
