'use client';

import socket from '@/api/socket';
import { AppDispatch, RootState } from '@/lib/store';
import {
  fetchMessages,
  markMessageSeen,
  addMessage,
  setMessages,
  recallMessage,
  deleteMessageForUser,
} from '@/lib/store/reducer/message/MessageSlice';
import { Conversation, UserType, Message } from '@/types';
import { Image, Skeleton, Dropdown, Button, message as antMessage } from 'antd';
import { MoreOutlined, DeleteOutlined, RollbackOutlined } from '@ant-design/icons';
import { LoadingOverlay } from '@/components/common';
import { useSkeletonLoading } from '@/hooks/useSkeletonLoading';
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

  // Sử dụng skeleton loading hook
  const { showSkeleton, handleRetry, hasError, errorMessage } = useSkeletonLoading({
    loading,
    error,
    retryFn: () => conversation?._id && dispatch(fetchMessages(conversation._id)),
  });

  useEffect(() => {
    if (currentUser?._id) {
      socket.emit('user_connected', currentUser._id);
    }
  }, [currentUser]);

  useEffect(() => {
    // Join vào conversation để nhận tin nhắn realtime
    if (conversation?._id) {
      socket.emit('join_conversation', conversation._id);
    }
  }, [conversation?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (conversation?._id && currentUser?._id) {
      dispatch(fetchMessages(conversation._id));
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

  useEffect(() => {
    // Lắng nghe tin nhắn mới realtime
    const handleReceiveMessage = (data: any) => {
      // Chỉ thêm tin nhắn nếu thuộc conversation hiện tại
      if (data.conversationId === conversation?._id) {
        // Thêm tin nhắn mới (server sẽ handle việc thay thế tin nhắn tạm)
        dispatch(addMessage(data));
      }
    };

    // Lắng nghe message recalled
    const handleMessageRecalled = (data: any) => {
      if (data.conversationId === conversation?._id) {
        const messageIndex = messages.findIndex((m) => m._id === data.messageId);
        if (messageIndex !== -1) {
          const updatedMessage = {
            ...messages[messageIndex],
            recalled: true,
            content: '[Tin nhắn đã được thu hồi]',
          };
          dispatch({ type: 'message/updateMessage', payload: updatedMessage });
        }
      }
    };

    // Lắng nghe message deleted
    const handleMessageDeleted = (data: any) => {
      if (data.conversationId === conversation?._id && data.userId === currentUser?._id) {
        // Xóa message khỏi state cho user hiện tại
        const messageIndex = messages.findIndex((m) => m._id === data.messageId);
        if (messageIndex !== -1) {
          const updatedMessage = {
            ...messages[messageIndex],
            deletedBy: [...(messages[messageIndex].deletedBy || []), currentUser?._id || ''],
          };
          dispatch({ type: 'message/updateMessage', payload: updatedMessage });
        }
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_recalled', handleMessageRecalled);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_recalled', handleMessageRecalled);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [dispatch, conversation?._id, currentUser?._id, messages]);

  // Handle message actions
  const handleRecallMessage = async (messageId: string) => {
    try {
      await dispatch(recallMessage(messageId)).unwrap();
      antMessage.success('Đã thu hồi tin nhắn');
    } catch (error: any) {
      const errorMessage = error?.message || 'Không thể thu hồi tin nhắn';
      antMessage.error(errorMessage);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await dispatch(deleteMessageForUser(messageId)).unwrap();
      antMessage.success('Đã xóa tin nhắn');
    } catch (error) {
      antMessage.error('Không thể xóa tin nhắn');
    }
  };

  // Check if message can be recalled (sender is current user and not already recalled)
  const canRecallMessage = (msg: Message) => {
    if (msg.senderId !== currentUser?._id) return false;
    if (msg.recalled) return false;

    // BE sẽ check thời gian, FE chỉ check sender và recalled status
    return true;
  };

  // Check if message can be deleted (sender is current user)
  const canDeleteMessage = (msg: Message) => {
    return msg.senderId === currentUser?._id;
  };

  // Message actions menu
  const getMessageActions = (msg: Message) => {
    const items = [];

    if (canRecallMessage(msg)) {
      items.push({
        key: 'recall',
        icon: <RollbackOutlined />,
        label: 'Thu hồi',
        onClick: () => handleRecallMessage(msg._id),
      });
    }

    if (canDeleteMessage(msg)) {
      items.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Xóa',
        onClick: () => handleDeleteMessage(msg._id),
      });
    }

    return items;
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if message is recalled
  const isMessageRecalled = (msg: Message) => {
    return msg.recalled || msg.content === '[Tin nhắn đã được thu hồi]';
  };

  // Check if message is deleted for current user
  const isMessageDeletedForUser = (msg: Message) => {
    return msg.deletedBy?.includes(currentUser?._id || '');
  };

  const selectedUser = useSelector((state: RootState) => state.conversationReducer.selectedUser);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );

  // Hiển thị placeholder khi chỉ có selectedUser (chưa có conversation)
  if (!selectedConversation && selectedUser) {
    return (
      <div className={styles.messageList}>
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#666',
          }}
        >
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            Bắt đầu cuộc trò chuyện với {selectedUser.nickname || selectedUser.username}
          </div>
          <div style={{ fontSize: '14px' }}>Nhập tin nhắn bên dưới để bắt đầu</div>
        </div>
      </div>
    );
  }

  // Không hiển thị gì nếu không có cả conversation và user
  if (!selectedConversation) return null;

  if (showSkeleton) {
    return (
      <div className={styles.messageList}>
        <div style={{ padding: '20px' }}>
          {[...Array(8)].map((_, idx) => (
            <div key={idx} style={{ marginBottom: '20px' }}>
              <Skeleton active avatar paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={styles.messageList}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ color: '#ff4d4f', marginBottom: '10px' }}>{errorMessage}</p>
          <button
            onClick={handleRetry}
            style={{
              padding: '8px 16px',
              background: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  function getFileExtIcon(name = '') {
    const ext = name.split('.').pop()?.toUpperCase() || '';
    return ext || 'FILE';
  }

  return (
    <div className={styles.messageList}>
      {messages
        .filter((msg) => !isMessageDeletedForUser(msg))
        .map((msg, idx) => {
          const senderId =
            typeof msg.senderId === 'string' ? msg.senderId : (msg.senderId as any)?._id;
          const isMe = currentUser && senderId === currentUser._id;
          const avatarUrl = isMe
            ? currentUser?.avatar
            : (typeof msg.senderId === 'object'
                ? (msg.senderId as any).avatar
                : msg.sender?.avatar) || conversation?.receiver?.avatar;

          // Lấy tên người gửi cho nhóm chat
          let senderName = '';
          if (conversation?.isGroup && !isMe) {
            // Nhóm chat: hiển thị tên người gửi (trừ current user)
            if (typeof msg.senderId === 'object' && msg.senderId) {
              senderName = (msg.senderId as any).nickname || (msg.senderId as any).username || '';
            } else if (msg.sender) {
              senderName = (msg.sender as any).nickname || msg.sender.username || '';
            }
          }
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
              key={`${msg._id}-${msg.createdAt}`}
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
                {/* Hiển thị tên người gửi trong nhóm chat */}
                {senderName && <div className={styles.senderName}>{senderName}</div>}

                {/* Check if message is recalled */}
                {isMessageRecalled(msg) ? (
                  <div className={styles.content}>
                    <span className={styles.recalledMessage}>[Tin nhắn đã được thu hồi]</span>
                  </div>
                ) : (
                  <>
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
                        style={{
                          maxWidth: 220,
                          borderRadius: 8,
                          marginBottom: 4,
                          display: 'block',
                        }}
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
                        onLoadedData={() =>
                          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
                        }
                      />
                    ) : (
                      <div className={styles.content}>{msg.content}</div>
                    )}
                  </>
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
                          fillOpacity="0.5"
                        />
                      </svg>
                      Đã xem
                    </span>
                  )}
                </div>
              </div>

              {/* Message actions dropdown for own messages */}
              {isMe && !isMessageRecalled(msg) && (
                <Dropdown
                  menu={{ items: getMessageActions(msg) }}
                  trigger={['click']}
                  placement="bottomRight"
                  overlayStyle={{ zIndex: 1000 }}
                >
                  <Button
                    type="text"
                    icon={<MoreOutlined />}
                    className={styles.messageActions}
                    size="small"
                  />
                </Dropdown>
              )}
            </div>
          );
        })}
      <div ref={bottomRef}></div>
    </div>
  );
}
