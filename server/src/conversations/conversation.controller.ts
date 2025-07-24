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
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from 'src/user/get-user.decorator';
import { User } from 'src/user/user.schema';

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
    },
  ) {
    const { receiverId, isGroup = false, groupName = '' } = body;
    const userId = req.user._id;

    return this.conversationService.createConversation(
      userId,
      receiverId,
      isGroup,
      groupName,
    );
  }

  // 🔐 Lấy tất cả đoạn chat của user
  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyConversations(@Request() req) {
    const userId = req.user._id; //
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
}
