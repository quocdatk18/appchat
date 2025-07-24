import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './message.schema';
import { MessageService } from './message.service';
// import { MessageController } from './message.controller';
import { UserModule } from '../user/user.module';
import { MessageController } from './message.controller';
import { MessageGateway } from './message.gateway';
import { ConversationModule } from '../conversations/conversation.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    UserModule,
    ConversationModule,
  ],
  providers: [MessageService, MessageGateway],
  controllers: [MessageController],
})
export class MessageModule {}
