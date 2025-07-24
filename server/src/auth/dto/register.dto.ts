import { IsEmail, IsEnum, IsIn, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
  @IsIn(['male', 'female', 'other'])

  gender: string;

  avatarUrl?:string;
}
