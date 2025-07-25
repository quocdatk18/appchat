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
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import { User } from './user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

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
  // 🔐 lấy trạng thái online của user
  @Get(':id/status')
  async getUserStatus(@Param('id') userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    };
  }
  // 🔐 cập nhật trạng thái online của user
  @UseGuards(JwtAuthGuard)
  @Patch(':id/online')
  updateOnlineStatus(
    @Param('id') userId: string,
    @Body('isOnline') isOnline: boolean,
  ) {
    return this.userService.updateStatus(userId, { isOnline });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    const userId = req.user._id;
    return this.userService.updateUser(userId, updateUserDto);
  }
}
