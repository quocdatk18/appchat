import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret', // fallback nếu thiếu
    });
  }

  async validate(payload: any) {
    return {
      _id: payload._id || payload.sub, // Ưu tiên lấy _id, fallback sub
      username: payload.username,
      email: payload.email,
      avatar: payload.avatar,
      fullname: payload.fullname,
    };
  }
}
