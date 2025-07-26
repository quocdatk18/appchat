import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.schema';
import { Model } from 'mongoose';
import { Types } from 'mongoose';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
    return this.userModel.find(
      {
        $and: [
          {
            $or: [
              { username: { $regex: query, $options: 'i' } },
              { nickname: { $regex: query, $options: 'i' } },
              { email: { $regex: query, $options: 'i' } },
            ],
          },
          { _id: { $ne: new Types.ObjectId(currentUserId) } }, // Ép về ObjectId
        ],
      },
      'id username nickname avatar email',
    );
  }

  async searchUserByEmail(email: string) {
    return this.userModel.findOne({ email }, 'id username avatar email');
  }

  async updateUser(userId: string, update: Partial<User>) {
    return this.userModel.findByIdAndUpdate(userId, update, { new: true });
  }
}
