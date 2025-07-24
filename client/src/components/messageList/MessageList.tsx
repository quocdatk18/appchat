'use client';

import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import styles from './MessageList.module.scss';
import { fetchMessages, addMessage } from '@/lib/store/reducer/message/MessageSlice';
import socket from '@/api/socket';

import { Conversation, UserType } from '@/types';

export interface ConversationState {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  selectedUser: UserType | null; // <--- Thêm dòng này
  loading: boolean;
  error: string | null;
}

export default function MessageList() {
  const dispatch = useDispatch<AppDispatch>();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const conversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const { messages, loading, error } = useSelector((state: RootState) => state.messageReducer);
  const currentUser = useSelector((state: RootState) => state.userReducer.user);
  useEffect(() => {
    if (currentUser?._id) {
      socket.emit('user_connected', currentUser._id);
    }
  }, [currentUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (conversation?._id && currentUser?._id) {
      dispatch(fetchMessages(conversation._id));
      socket.emit('join_conversation', conversation._id);
    }
  }, [conversation, currentUser, dispatch]);

  const selectedUser = useSelector((state: RootState) => state.conversationReducer.selectedUser);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );

  if (!selectedUser) return;
  if (!selectedConversation) return;

  if (loading) {
    return <div className={styles.messageList}>Đang tải tin nhắn...</div>;
  }

  if (error) {
    return <div className={styles.messageList}>❌ Lỗi: {error}</div>;
  }

  return (
    <div className={styles.messageList}>
      {messages.map((msg) => {
        const isMe = msg.senderId === currentUser?._id;
        const avatarUrl = isMe
          ? currentUser.avatar
          : msg.sender?.avatar || conversation?.receiver?.avatar;

        return (
          <div
            key={msg._id}
            className={`${styles.messageWrapper} ${isMe ? styles.me : styles.other}`}
          >
            {!isMe && (
              <img
                src={avatarUrl || '/avtDefault.png'}
                alt="avatar"
                className={styles.avatar}
                onClick={() => {
                  console.log('Click avatar:', msg.senderId);
                }}
              />
            )}
            <div className={styles.message}>
              <div className={styles.content}>{msg.content}</div>
              <div className={styles.time}>
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef}></div>
    </div>
  );
}
