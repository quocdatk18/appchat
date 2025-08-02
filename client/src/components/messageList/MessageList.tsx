'use client';

import socket from '@/api/socket';
import { useSkeletonLoading } from '@/hooks/useSkeletonLoading';
import { AppDispatch, RootState } from '@/lib/store';
import {
  deleteMessageForUser,
  deleteMessageForAll,
  fetchMessages,
  recallMessage,
  updateMessage,
  removeMessage,
} from '@/lib/store/reducer/message/MessageSlice';
import { Conversation, Message, UserType } from '@/types';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal, Skeleton } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MessageItem from './MessageItem';
import styles from './MessageList.module.scss';

export default React.memo(function MessageList({
  onAvatarClick,
}: {
  onAvatarClick?: (user: any) => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    action: 'recall' | 'delete' | 'delete-for-all' | null;
    messageId: string | null;
    message: string;
  }>({ visible: false, action: null, messageId: null, message: '' });

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
  } = useSelector((state: RootState) => state.messageReducer);
  const { user: currentUser } = useSelector((state: RootState) => state.userReducer);
  const { selectedConversation, selectedUser } = useSelector(
    (state: RootState) => state.conversationReducer
  );

  const { showSkeleton, hasError, errorMessage, handleRetry } = useSkeletonLoading({
    loading: messagesLoading,
    error: messagesError,
  });

  useEffect(() => {
    if (selectedConversation?._id && currentUser?._id) {
      dispatch(fetchMessages(selectedConversation._id));
    }
  }, [selectedConversation?._id, currentUser?._id, dispatch]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessageRecalled = (data: any) => {
      if (data.conversationId === selectedConversation?._id) {
        dispatch(
          updateMessage({ _id: data.messageId, recalled: true, recallAt: new Date().toISOString() })
        );
      }
    };

    const handleMessageDeleted = (data: any) => {
      if (data.conversationId === selectedConversation?._id) {
        // Chỉ ẩn tin nhắn khỏi user đã xóa, không xóa hoàn toàn
        const message = messages.find((m) => m._id === data.messageId);
        if (message) {
          const updatedDeletedBy = [...(message.deletedBy || []), data.userId];
          dispatch(
            updateMessage({
              _id: data.messageId,
              deletedBy: updatedDeletedBy,
            })
          );
        }
      }
    };

    const handleMessageDeletedForAll = (data: any) => {
      if (data.conversationId === selectedConversation?._id) {
        // Cập nhật tin nhắn thành đã xóa cho tất cả
        dispatch(
          updateMessage({
            _id: data.messageId,
            deletedForAll: data.deletedForAll,
            deletedForAllAt: data.deletedForAllAt,
            deletedForAllBy: data.deletedForAllBy,
          })
        );
      }
    };

    socket.on('message_recalled', handleMessageRecalled);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_deleted_for_all', handleMessageDeletedForAll);

    return () => {
      socket.off('message_recalled', handleMessageRecalled);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_deleted_for_all', handleMessageDeletedForAll);
    };
  }, [dispatch, selectedConversation, messages]);

  const showConfirmModal = (
    action: 'recall' | 'delete' | 'delete-for-all',
    messageId: string,
    message: string
  ) => {
    setConfirmModal({ visible: true, action, messageId, message });
  };

  const hideConfirmModal = () =>
    setConfirmModal({ visible: false, action: null, messageId: null, message: '' });

  const handleConfirmAction = async () => {
    if (!confirmModal.messageId || !confirmModal.action) return;
    try {
      if (confirmModal.action === 'recall') {
        await dispatch(recallMessage(confirmModal.messageId)).unwrap();
      } else if (confirmModal.action === 'delete') {
        await dispatch(deleteMessageForUser(confirmModal.messageId)).unwrap();
      } else if (confirmModal.action === 'delete-for-all') {
        await dispatch(deleteMessageForAll(confirmModal.messageId)).unwrap();
      }
    } catch (error) {
      console.error(error);
    } finally {
      hideConfirmModal();
    }
  };

  const handleRecallMessage = useCallback(
    (messageId: string) =>
      showConfirmModal('recall', messageId, 'Bạn có chắc muốn thu hồi tin nhắn này?'),
    []
  );
  const handleDeleteMessage = useCallback(
    (messageId: string) =>
      showConfirmModal('delete', messageId, 'Bạn có chắc muốn xóa tin nhắn này?'),
    []
  );

  const handleDeleteMessageForAll = useCallback(
    (messageId: string) =>
      showConfirmModal(
        'delete-for-all',
        messageId,
        'Bạn có chắc muốn ẩn tin nhắn này khỏi cuộc trò chuyện ?'
      ),
    []
  );

  const isMessageDeletedForUser = useCallback(
    (msg: Message) => msg.deletedBy?.includes(currentUser?._id || ''),
    [currentUser?._id]
  );

  const getFileExtIcon = useCallback(
    (name = '') => name.split('.').pop()?.toUpperCase() || 'FILE',
    []
  );

  const filteredMessages = useMemo(
    () => messages.filter((msg) => !isMessageDeletedForUser(msg)),
    [messages, isMessageDeletedForUser]
  );

  if (!selectedConversation && !selectedUser)
    return (
      <div className={styles.messageList}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#666',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            Chọn một cuộc trò chuyện để bắt đầu
          </div>
          <div style={{ fontSize: '14px' }}>Tin nhắn sẽ hiển thị ở đây</div>
        </div>
      </div>
    );
  if (selectedUser && !selectedConversation)
    return (
      <div className={styles.messageList}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#666',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            Bắt đầu cuộc trò chuyện với {selectedUser.nickname || selectedUser.username}
          </div>
          <div style={{ fontSize: '14px' }}>Nhập tin nhắn bên dưới để bắt đầu</div>
        </div>
      </div>
    );
  if (!selectedConversation) return null;

  if (showSkeleton)
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
  if (hasError)
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

  return (
    <>
      <div className={styles.messageList}>
        {filteredMessages.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Không có tin nhắn nào
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const senderId = msg.senderId._id;
            const isMe = currentUser && senderId === currentUser._id;
            const isLastMyMessage =
              isMe &&
              filteredMessages.slice(idx + 1).every((m) => m.senderId._id !== currentUser?._id);
            const isSeen = isLastMyMessage && msg.seenBy?.some((uid) => uid !== currentUser?._id);
            return (
              <MessageItem
                key={`${msg._id}-${msg.createdAt}`}
                msg={msg}
                isMe={!!isMe}
                currentUser={currentUser}
                onAvatarClick={onAvatarClick}
                onRecallMessage={handleRecallMessage}
                onDeleteMessage={handleDeleteMessage}
                onDeleteMessageForAll={handleDeleteMessageForAll}
                isLastMyMessage={!!isLastMyMessage}
                isSeen={!!isSeen}
                getFileExtIcon={getFileExtIcon}
                isGroup={selectedConversation?.isGroup || false}
                conversation={selectedConversation}
              />
            );
          })
        )}
        <div ref={bottomRef}></div>
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>Xác nhận</span>
          </div>
        }
        open={confirmModal.visible}
        onOk={handleConfirmAction}
        onCancel={hideConfirmModal}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{
          danger: confirmModal.action === 'delete',
          style: {
            background: confirmModal.action === 'delete' ? '#ff4d4f' : '#1890ff',
            borderColor: confirmModal.action === 'delete' ? '#ff4d4f' : '#1890ff',
          },
        }}
      >
        <p>{confirmModal.message}</p>
        {confirmModal.action === 'recall' && (
          <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
            Tin nhắn sẽ được thu hồi khỏi cuộc trò chuyện này.
          </p>
        )}
        {confirmModal.action === 'delete' && (
          <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
            Tin nhắn sẽ bị xóa khỏi cuộc trò chuyện này.
          </p>
        )}
      </Modal>
    </>
  );
});
