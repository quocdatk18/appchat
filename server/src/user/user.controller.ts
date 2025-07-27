import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  NotFoundException,
  Patch,
  Body,
  Req,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import { User } from './user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestChangeEmailDto } from './dto/request-change-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { SupportRequestDto } from './dto/support-request.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@GetUser() user: User) {
    return this.userService.findById(user._id);
  }

  // 🔐 tìm kiếm user
  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchUsers(@Query('q') query: string, @GetUser() user: User) {
    return this.userService.searchUsers(query, user._id);
  }

  // 🔐 tìm kiếm user theo email
  @UseGuards(JwtAuthGuard)
  @Get('searchByEmail')
  async searchUserByEmail(
    @Query('email') email: string,
    @GetUser() user: User,
  ) {
    const foundUser = await this.userService.searchUserByEmail(email);
    // Nếu tìm thấy user và user đó không phải là user hiện tại thì trả về
    if (foundUser && foundUser._id.toString() !== user._id.toString()) {
      return foundUser;
    }
    // Nếu là chính mình hoặc không tìm thấy thì trả về null
    return null;
  }

  // 🔐 lấy thông tin user
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  // 🔐 Đổi mật khẩu
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    try {
      await this.userService.changePassword(
        user._id,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );
      return { message: 'Password changed successfully' };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  // 🔐 Yêu cầu đổi email - gửi yêu cầu qua email support
  @UseGuards(JwtAuthGuard)
  @Post('request-change-email')
  async requestChangeEmail(
    @GetUser() user: User,
    @Body() requestChangeEmailDto: RequestChangeEmailDto,
  ) {
    try {
      await this.userService.requestChangeEmail(
        user._id,
        requestChangeEmailDto.currentPassword,
        requestChangeEmailDto.newEmail,
        requestChangeEmailDto.reason,
      );
      return { message: 'Email change request sent to support' };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  // 🔐 Quên mật khẩu - sinh mật khẩu mới và gửi về email
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      await this.userService.forgotPassword(forgotPasswordDto.email);
      return { message: 'New password has been sent to your email' };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  // 🔐 Admin đổi email cho user (chỉ Super Admin)
  @UseGuards(JwtAuthGuard)
  @Post('admin/change-email')
  async adminChangeEmail(
    @GetUser() user: User,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    if (user.role !== 'admin') {
      throw new NotFoundException('Only Super Admin can change user emails');
    }

    try {
      await this.userService.changeEmail(
        changeEmailDto.userId,
        changeEmailDto.newEmail,
      );
      return { message: 'Email changed successfully and notifications sent' };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  // 🔐 Gửi yêu cầu hỗ trợ
  @Post('support-request')
  async sendSupportRequest(@Body() supportRequestDto: SupportRequestDto) {
    try {
      await this.userService.sendSupportRequest(supportRequestDto);
      return { message: 'Support request sent successfully' };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  // 🔐 Cập nhật trạng thái online
  @UseGuards(JwtAuthGuard)
  @Patch(':id/online')
  async updateOnlineStatus(
    @Param('id') id: string,
    @Body() body: { isOnline: boolean },
    @GetUser() user: User,
  ) {
    if (id !== user._id.toString()) {
      throw new NotFoundException('Unauthorized');
    }

    await this.userService.updateStatus(id, {
      isOnline: body.isOnline,
      lastSeen: body.isOnline ? undefined : new Date(),
    });

    return { message: 'Status updated successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    const userId = req.user._id;
    return this.userService.updateUser(userId, updateUserDto);
  }
}
