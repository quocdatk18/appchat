// components/Chat/ConversationList.tsx
'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { List, Avatar } from 'antd';
import { setMessages } from '@/lib/store/reducer/message/MessageSlice';
import { setSelectedConversation } from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { Message } from '@/types';

const ConversationList = () => {
  const dispatch = useDispatch<AppDispatch>();
  const conversations = useSelector((state: RootState) => state.conversationReducer.conversations);

  const handleSelectConversation = (conversation: any) => {
    dispatch(setSelectedConversation(conversation));

    // 🚩 Giả lập load message, sau này thay API call
    const fakeMessages: Message[] = [
      {
        _id: '1',
        conversationId: 'abc123',
        senderId: 'userA',
        receiverId: 'userB',
        content: 'Hello!',
        createdAt: new Date().toISOString(),
      },
      {
        _id: '2',
        conversationId: 'abc123',
        senderId: 'userB',
        receiverId: 'userA',
        content: 'Hi!',
        createdAt: new Date().toISOString(),
      },
    ];
    dispatch(setMessages(fakeMessages));
  };

  return (
    <List
      itemLayout="horizontal"
      dataSource={conversations}
      renderItem={(item) => (
        <List.Item onClick={() => handleSelectConversation(item)} style={{ cursor: 'pointer' }}>
          <List.Item.Meta
            avatar={<Avatar src={item.receiver?.avatar} />}
            title={item.receiver?.username}
            description={item.lastMessage || 'Bắt đầu trò chuyện'}
          />
        </List.Item>
      )}
    />
  );
};

export default ConversationList;
