import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nickname?: string; // tên hiển thị, cho phép đổi

  @IsOptional()
  @IsString()
  avatar?: string; // url hoặc path đã upload
}
