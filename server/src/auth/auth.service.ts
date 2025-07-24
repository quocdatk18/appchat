import { LoginDto } from './dto/login.dto';
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

const JWT_SECRET = 'your_jwt_secret_key'; // sau này nên để vào .env
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const errors: Record<string, string> = {};
    const { username, email, password, gender } = registerDto;

    // Kiểm tra trùng username/email
    const existingUser = await this.userService.findByUsername(username);
    if (existingUser) {
      errors.username = 'Tên người dùng đã tồn tại';
    }

    const existingEmail = await this.userService.findByEmail(email);
    existingEmail;
    if (existingEmail) {
      errors.email = 'Email đã được sử dụng';
    }
    if (Object.keys(errors).length > 0) {
      errors;
      throw new BadRequestException({
        statusCode: 400,
        message: errors,
      });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user
    try {
      const user = await this.userService.create({
        username,
        email,
        password: hashedPassword,
        gender,
      });
    } catch (err) {
      console.error('Lỗi khi lưu user vào MongoDB:', err);
    }
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const user = await this.userService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Tên Đăng Nhập không đúng');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Mật khẩu không đúng');
    }

    const payload = {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    };

    const token = this.jwtService.sign(payload);

    return {
      message: 'Đăng nhập thành công',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    };
  }
}
