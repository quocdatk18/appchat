'use client';

import socket from '@/api/socket';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchMessages } from '@/lib/store/reducer/message/MessageSlice';
import { Conversation, UserType } from '@/types';
import { LoadingOutlined } from '@ant-design/icons';
import { Image, Skeleton, Spin } from 'antd';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './MessageList.module.scss';

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
    return (
      <div className={styles.messageList}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.messageList}>
        <Skeleton active avatar paragraph={{ rows: 4 }} />
      </div>
    );
  }

  function getFileExtIcon(name = '') {
    const ext = name.split('.').pop()?.toUpperCase() || '';
    return ext || 'FILE';
  }

  return (
    <div className={styles.messageList}>
      {messages.map((msg) => {
        const isMe = msg.senderId === currentUser?._id;
        const avatarUrl = isMe
          ? currentUser.avatar
          : msg.sender?.avatar || conversation?.receiver?.avatar;
        {
        }
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
              {msg.mediaUrl &&
              msg.mimetype &&
              !msg.mimetype.startsWith('image/') &&
              !msg.mimetype.startsWith('video/') ? (
                <div className={styles.fileBox}>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileIcon}>{getFileExtIcon(msg.originalName)}</div>
                    <div className={styles.fileMeta}>
                      <div className={styles.fileName}>{msg.originalName || 'Tải file'}</div>
                    </div>
                  </div>
                  <a
                    href={msg.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadBtn}
                  >
                    ⬇
                  </a>
                </div>
              ) : msg.mediaUrl && msg.mimetype && msg.mimetype.startsWith('image/') ? (
                <Image
                  src={msg.mediaUrl}
                  preview={{ mask: null }}
                  style={{ maxWidth: 220, borderRadius: 8, marginBottom: 4, display: 'block' }}
                />
              ) : msg.mediaUrl && msg.mimetype && msg.mimetype.startsWith('video/') ? (
                <video
                  src={msg.mediaUrl}
                  controls
                  style={{
                    maxWidth: 220,
                    borderRadius: 8,
                    marginBottom: 4,
                    display: 'block',
                    background: '#000',
                  }}
                />
              ) : (
                <div className={styles.content}>{msg.content}</div>
              )}
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
