import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.schema';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { EmailService } from './email.service';

@Injectable()
export class UserService {
  private emailService = new EmailService();

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // Helper function để escape regex pattern
  private escapeRegexPattern(pattern: string): string {
    return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async updateStatus(
    userId: string,
    status: { isOnline: boolean; lastSeen?: Date },
  ) {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        isOnline: status.isOnline,
        ...(status.lastSeen && { lastSeen: status.lastSeen }),
      },
    });
  }

  // Lấy thời điểm last seen
  async getLastSeen(userId: string): Promise<Date | null> {
    const user = await this.userModel.findById(userId).select('lastSeen');
    return user?.lastSeen ?? null;
  }

  async searchUsers(query: string, currentUserId: string) {
    const escapedQuery = this.escapeRegexPattern(query);
    return this.userModel.find(
      {
        $and: [
          {
            $or: [
              { username: { $regex: escapedQuery, $options: 'i' } },
              { nickname: { $regex: escapedQuery, $options: 'i' } },
              { email: { $regex: escapedQuery, $options: 'i' } },
            ],
          },
          { _id: { $ne: new Types.ObjectId(currentUserId) } },
        ],
      },
      { password: 0 },
    );
  }

  async searchUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email });
  }

  // Đổi mật khẩu
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Kiểm tra mật khẩu hiện tại
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new Error(
        'Mật khẩu hiện tại không chính xác,nếu quên mật khẩu,hãy gửi yêu cầu cấp lại mật khẩu',
      );
    }

    // Hash mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
    });
    return true;
  }

  // Yêu cầu đổi email - gửi yêu cầu qua email support
  async requestChangeEmail(
    userId: string,
    currentPassword: string,
    newEmail: string,
    reason: string,
  ): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Kiểm tra mật khẩu hiện tại
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Kiểm tra email mới đã tồn tại chưa
    const existingUser = await this.userModel.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new Error('Email already exists');
    }

    // Gửi email thông báo cho admin/support
    await this.emailService.sendMail(
      process.env.EMAIL_USER || 'your-app@gmail.com',
      'Yêu cầu đổi email từ user',
      `<p>User: ${user.username} (${user.email})</p>
       <p>Email mới: ${newEmail}</p>
       <p>Lý do: ${reason}</p>
       <p>Thời gian yêu cầu: ${new Date().toISOString()}</p>`,
    );

    return true;
  }

  // Quên mật khẩu - sinh mật khẩu mới và gửi về email
  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new Error('Email not found');
    }

    // Sinh mật khẩu mới (8 ký tự, bao gồm chữ hoa, chữ thường, số)
    const newPassword = this.generateRandomPassword();

    // Hash mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu mới vào DB
    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedNewPassword,
    });

    // Gửi mật khẩu mới về email
    await this.emailService.sendMail(
      user.email,
      'Mật khẩu mới cho tài khoản của bạn',
      `<p>Xin chào ${user.username},</p>
       <p>Mật khẩu mới của bạn là: <b>${newPassword}</b></p>
       <p>Hãy đăng nhập và đổi lại mật khẩu nếu cần.</p>`,
    );

    return true;
  }

  // Hàm sinh mật khẩu ngẫu nhiên
  private generateRandomPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Cập nhật thông tin user
  async updateUser(userId: string, update: Partial<User>) {
    return this.userModel.findByIdAndUpdate(userId, update, { new: true });
  }

  // Đổi email thành công - gửi thông báo cho cả email cũ và mới
  async changeEmail(userId: string, newEmail: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oldEmail = user.email;

    // Cập nhật email mới
    await this.userModel.findByIdAndUpdate(userId, { email: newEmail });

    // Gửi thông báo đến email cũ
    await this.emailService.sendMail(
      oldEmail,
      'Tài khoản của bạn đã được thay đổi email',
      `<p>Xin chào ${user.username},</p>
       <p>Email tài khoản của bạn vừa được đổi từ <b>${oldEmail}</b> sang <b>${newEmail}</b>.</p>
       <p>Nếu bạn không thực hiện thay đổi này, hãy liên hệ hỗ trợ ngay lập tức!</p>`,
    );

    // Gửi xác nhận đến email mới
    await this.emailService.sendMail(
      newEmail,
      'Bạn đã đổi email thành công',
      `<p>Xin chào ${user.username},</p>
       <p>Email của bạn đã được đổi thành công sang địa chỉ này.</p>`,
    );

    return true;
  }

  // Gửi email hỗ trợ khách hàng
  async sendSupportRequest(supportData: {
    subject: string;
    message: string;
    userEmail: string;
    username: string;
  }): Promise<boolean> {
    try {
      // Gửi email đến support
      await this.emailService.sendMail(
        process.env.EMAIL_USER || 'quocdatlop109@gmail.com',
        `Yêu cầu hỗ trợ từ ${supportData.username}`,
        `<h3>Yêu cầu hỗ trợ mới</h3>
         <p><strong>Người gửi:</strong> ${supportData.username}</p>
         <p><strong>Email:</strong> ${supportData.userEmail}</p>
         <p><strong>Tiêu đề:</strong> ${supportData.subject}</p>
         <p><strong>Nội dung:</strong></p>
         <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
           ${supportData.message.replace(/\n/g, '<br>')}
         </div>
         <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>`,
      );

      // Gửi email xác nhận cho user
      await this.emailService.sendMail(
        supportData.userEmail,
        'Yêu cầu hỗ trợ đã được gửi',
        `<p>Xin chào ${supportData.username},</p>
         <p>Yêu cầu hỗ trợ của bạn đã được gửi thành công.</p>
         <p><strong>Tiêu đề:</strong> ${supportData.subject}</p>
         <p>Chúng tôi sẽ phản hồi trong thời gian sớm nhất.</p>
         <p>Trân trọng,<br>Đội ngũ hỗ trợ</p>`,
      );

      return true;
    } catch (error) {
      console.error('Error sending support email:', error);
      throw new Error('Failed to send support request');
    }
  }
}
