import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as passport from 'passport';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: '*',
  }); // Cho phép frontend kết nối socket
  app.use(passport.initialize());
  app.useStaticAssets(join(__dirname, '..', 'uploads'));
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
