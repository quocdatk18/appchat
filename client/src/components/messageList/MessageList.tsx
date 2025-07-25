'use client';

import socket from '@/api/socket';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchMessages, markMessageSeen } from '@/lib/store/reducer/message/MessageSlice';
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

export default function MessageList({ onAvatarClick }: { onAvatarClick?: (user: any) => void }) {
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

  useEffect(() => {
    if (!conversation?._id || !currentUser?._id) return;
    // Emit seen_message cho các message chưa đọc
    messages.forEach((msg) => {
      if (
        msg._id &&
        msg.senderId !== currentUser._id &&
        (!msg.seenBy || !msg.seenBy.includes(currentUser._id))
      ) {
        socket.emit('seen_message', {
          messageId: msg._id,
          userId: currentUser._id,
          conversationId: conversation._id,
        });
      }
    });
  }, [messages, conversation, currentUser]);

  useEffect(() => {
    // Lắng nghe event message_seen để cập nhật UI
    const handler = ({ messageId, userId }: { messageId: string; userId: string }) => {
      dispatch(markMessageSeen({ messageId, userId }));
    };
    socket.on('message_seen', handler);
    return () => {
      socket.off('message_seen', handler);
    };
  }, [dispatch]);

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
      {messages.map((msg, idx) => {
        const senderId =
          typeof msg.senderId === 'string' ? msg.senderId : (msg.senderId as any)?._id;
        const isMe = currentUser && senderId === currentUser._id;
        const avatarUrl = isMe
          ? currentUser?.avatar
          : (typeof msg.senderId === 'object'
              ? (msg.senderId as any).avatar
              : msg.sender?.avatar) || conversation?.receiver?.avatar;
        // Kiểm tra có phải là message cuối cùng mình gửi không
        const isLastMyMessage =
          isMe &&
          messages.slice(idx + 1).every((m) => {
            const sId = typeof m.senderId === 'string' ? m.senderId : (m.senderId as any)?._id;
            return sId !== currentUser._id;
          });
        // Kiểm tra đã được user nhận xem chưa (1-1)
        const isSeen =
          isLastMyMessage && msg.seenBy && msg.seenBy.some((uid) => uid !== currentUser._id);
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
                onClick={() =>
                  onAvatarClick &&
                  msg.senderId &&
                  typeof msg.senderId === 'object' &&
                  onAvatarClick(msg.senderId)
                }
                style={{ cursor: 'pointer' }}
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
                  onLoad={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
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
                  onLoadedData={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
                />
              ) : (
                <div className={styles.content}>{msg.content}</div>
              )}
              <div className={styles.time}>
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {isSeen && (
                  <span className={styles.seen}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7.5 13.5L4 10L2.5 11.5L7.5 16.5L17.5 6.5L16 5L7.5 13.5Z"
                        fill="#1890ff"
                      />
                      <path
                        d="M11.5 13.5L8 10L6.5 11.5L11.5 16.5L19.5 8.5L18 7L11.5 13.5Z"
                        fill="#1890ff"
                        fill-opacity="0.5"
                      />
                    </svg>
                    Đã xem
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef}></div>
    </div>
  );
}
