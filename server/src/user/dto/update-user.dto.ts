import { IsOptional, IsEnum, IsString } from 'class-validator';

export enum Gender {
  Male = 'male',
  Female = 'female',
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nickname?: string; // tên hiển thị, cho phép đổi

  @IsOptional()
  @IsString()
  avatar?: string; // url hoặc path đã upload

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
