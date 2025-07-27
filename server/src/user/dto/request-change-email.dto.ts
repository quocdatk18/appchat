import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestChangeEmailDto {
  @IsNotEmpty()
  currentPassword: string;

  @IsEmail()
  newEmail: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
