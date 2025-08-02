import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Param,
  Query,
  Delete,
  Patch,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from 'src/user/get-user.decorator';
import { User } from 'src/user/user.schema';
import { RestoreConversationDto } from './dto/restore-conversation.dto';

@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  // 🔐 Tạo đoạn chat mới (1-1 hoặc nhóm)
  @UseGuards(JwtAuthGuard)
  @Post()
  async createConversation(
    @Request() req,
    @Body()
    body: {
      receiverId: string | string[];
      isGroup?: boolean;
      groupName?: string;
      content?: string;
      type?: string;
      mediaUrl?: string;
    },
  ) {
    const {
      receiverId,
      isGroup = false,
      groupName = '',
      content,
      type = 'text',
      mediaUrl = '',
    } = body;
    const userId = req.user._id;

    return this.conversationService.createConversation(
      userId,
      receiverId,
      isGroup,
      groupName,
      content,
      type,
      mediaUrl,
    );
  }

  // 🔐 Lấy tất cả đoạn chat của user
  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyConversations(@Request() req) {
    const userId: string = req.user._id.toString();
    return this.conversationService.getUserConversations(userId);
  }

  // 🔐 tìm kiếm đoạn chat của user
  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchConversation(@Request() req, @Query('q') query: string) {
    const userId = req.user._id;
    return this.conversationService.searchConversation(userId, query || '');
  }

  // 🔐 Lấy chi tiết một đoạn chat
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOneConversation(@Param('id') id: string) {
    return this.conversationService.getConversationById(id);
  }

  // 🔐 Xoá một đoạn chat
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteConversation(@Param('id') id: string) {
    return this.conversationService.deleteConversation(id);
  }

  // Xoá conversation phía 1 user
  @UseGuards(JwtAuthGuard)
  @Patch(':id/delete')
  async deleteConversationForUser(@Param('id') id: string, @Req() req) {
    const userId = req.user._id;
    return this.conversationService.deleteConversationForUser(id, userId);
  }

  // 🔐 Thêm thành viên vào nhóm
  @UseGuards(JwtAuthGuard)
  @Patch(':id/add-members')
  async addMembersToGroup(
    @Param('id') id: string,
    @Body() body: { memberIds: string[] },
    @Req() req,
  ) {
    const userId = req.user._id;
    return this.conversationService.addMembersToGroup(
      id,
      body.memberIds,
      userId,
    );
  }

  // 🔐 Cập nhật thông tin nhóm (chỉ người tạo mới được)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/update')
  async updateGroup(
    @Param('id') id: string,
    @Body() body: { name?: string; avatar?: string },
    @Req() req,
  ) {
    const userId = req.user._id;
    return this.conversationService.updateGroup(id, body, userId);
  }

  // 🔐 Xóa thành viên khỏi nhóm
  @UseGuards(JwtAuthGuard)
  @Patch(':id/remove-members')
  async removeMembersFromGroup(
    @Param('id') id: string,
    @Body() body: { memberIds: string[] },
    @Req() req,
  ) {
    const userId = req.user._id;
    return this.conversationService.removeMembersFromGroup(
      id,
      body.memberIds,
      userId,
    );
  }

  // 🔐 Lấy thông tin chi tiết nhóm
  @UseGuards(JwtAuthGuard)
  @Get(':id/group-info')
  async getGroupInfo(@Param('id') id: string, @Req() req) {
    const userId = req.user._id;
    return this.conversationService.getGroupInfo(id, userId);
  }

  // Phục hồi conversation (admin)
  @UseGuards(JwtAuthGuard)
  @Post('admin/restore')
  async restoreConversation(
    @GetUser() user: User,
    @Body() body: RestoreConversationDto,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('No permission');
    await this.conversationService.restoreConversation(body.conversationId);
    return { message: 'Conversation restored successfully' };
  }

  // Tìm conversation theo name (admin)
  @UseGuards(JwtAuthGuard)
  @Get('admin/search')
  async adminSearchConversation(
    @GetUser() user: User,
    @Query('name') name: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('No permission');
    if (!name) return [];
    return this.conversationService.searchConversationsByName(name);
  }

  // Reset unreadCount cho conversation
  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markConversationAsRead(@Param('id') id: string, @Req() req) {
    const userId = req.user._id;
    return this.conversationService.resetUnreadCount(id, userId);
  }

  // Khôi phục conversation cho user (khi user nhắn tin lại)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/restore-user')
  async restoreConversationForUser(@Param('id') id: string, @Req() req) {
    const userId = req.user._id;
    return this.conversationService.restoreConversationForUser(id, userId);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  async deactivateGroup(@Param('id') id: string, @GetUser() user: any) {
    return this.conversationService.deactivateGroup(id, user._id);
  }
}
