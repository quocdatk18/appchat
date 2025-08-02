import React, { useMemo } from 'react';
import { Button, Dropdown, Image } from 'antd';
import { DeleteOutlined, MoreOutlined, RollbackOutlined } from '@ant-design/icons';
import { Message, Conversation } from '@/types';
import styles from './MessageList.module.scss';

interface MessageItemProps {
  msg: Message;
  isMe: boolean;
  currentUser: any;
  onAvatarClick?: (user: any) => void;
  onRecallMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onDeleteMessageForAll?: (messageId: string) => void;
  isLastMyMessage: boolean;
  isSeen: boolean;
  getFileExtIcon: (name: string) => string;
  isGroup: boolean;
  conversation?: Conversation;
}

const MessageItem = React.memo(
  ({
    msg,
    isMe,
    currentUser,
    onAvatarClick,
    onRecallMessage,
    onDeleteMessage,
    onDeleteMessageForAll,
    isSeen,
    getFileExtIcon,
    isGroup,
    conversation,
  }: MessageItemProps) => {
    // Memoize các giá trị tính toán
    const avatar = useMemo(() => {
      return isMe ? currentUser?.avatar : msg.senderId?.avatar;
    }, [isMe, currentUser?.avatar, msg.senderId?.avatar]);
    const senderName = useMemo(() => {
      if (msg.senderId) {
        return msg.senderId.nickname || msg.senderId.username || '';
      }
      return '';
    }, [msg.senderId]);

    const isMessageRecalled = useMemo(() => {
      return msg.recalled === true;
    }, [msg.recalled]);

    const isMessageDeletedForAll = useMemo(() => {
      return msg.deletedForAll === true;
    }, [msg.deletedForAll]);

    const canRecallMessage = useMemo(() => {
      // Không cho thu hồi nếu đã thu hồi hoặc đã xóa cho tất cả
      if (msg.recalled || msg.deletedForAll) return false;

      // Kiểm tra thời gian thu hồi (30 ngày như Zalo/Facebook)
      const messageTime = new Date(msg.createdAt).getTime();
      const currentTime = new Date().getTime();
      const maxRecallTime = 30 * 24 * 60 * 60 * 1000; // 30 ngày

      if (currentTime - messageTime > maxRecallTime) {
        return false;
      }

      // Người gửi luôn có quyền thu hồi
      if (msg.senderId?._id === currentUser?._id) return true;

      // Nếu là nhóm chat, admin có quyền thu hồi tin nhắn của người khác
      if (isGroup && conversation) {
        const isAdmin = conversation.createdBy === currentUser?._id;
        if (isAdmin) return true;
      }

      return false;
    }, [
      msg.recalled,
      msg.deletedForAll,
      msg.createdAt,
      msg.senderId?._id,
      currentUser?._id,
      isGroup,
      conversation,
    ]);

    const canDeleteMessage = useMemo(() => {
      // Không cho xóa nếu đã xóa cho tất cả
      if (msg.deletedForAll) return false;

      // Người gửi luôn có quyền xóa tin nhắn của mình
      if (msg.senderId?._id === currentUser?._id) return true;

      // User thường có quyền ẩn tin nhắn của người khác (ẩn khỏi bên mình)
      // Admin trong nhóm có quyền xóa tin nhắn của user khác
      return true;
    }, [msg.deletedForAll, msg.senderId?._id, currentUser?._id]);

    const canDeleteMessageForAll = useMemo(() => {
      // Chỉ admin mới có quyền xóa cho tất cả
      if (!conversation?.isGroup) return false;

      const isAdmin = conversation.createdBy === currentUser?._id;
      return isAdmin;
    }, [conversation?.isGroup, conversation?.createdBy, currentUser?._id]);

    const messageActions = useMemo(() => {
      const items = [];
      const isMyMessage = msg.senderId?._id === currentUser?._id;
      const isAdmin = conversation?.createdBy === currentUser?._id;

      if (canRecallMessage) {
        items.push({
          key: 'recall',
          icon: <RollbackOutlined />,
          label: isMyMessage ? 'Thu hồi' : 'Thu hồi tin nhắn này',
          onClick: () => onRecallMessage(msg._id),
        });
      }

      if (canDeleteMessage) {
        let deleteLabel = '';
        let deleteAction = () => onDeleteMessage(msg._id);

        if (isMyMessage) {
          // Tin nhắn của mình
          if (canDeleteMessageForAll && onDeleteMessageForAll) {
            // Admin có 2 lựa chọn: xóa cho mình hoặc xóa cho tất cả
            items.push({
              key: 'delete',
              icon: <DeleteOutlined />,
              label: msg.recalled ? 'Xóa tin nhắn thu hồi' : 'Xóa chỉ ở phía tôi',
              onClick: () => onDeleteMessage(msg._id),
            });
            items.push({
              key: 'delete-for-all',
              icon: <DeleteOutlined />,
              label: 'Ẩn khỏi nhóm này',
              onClick: () => onDeleteMessageForAll(msg._id),
            });
          } else {
            // User thường chỉ có 1 lựa chọn
            deleteLabel = msg.recalled ? 'Xóa tin nhắn thu hồi' : 'Xóa chỉ ở phía tôi ';
            items.push({
              key: 'delete',
              icon: <DeleteOutlined />,
              label: deleteLabel,
              onClick: deleteAction,
            });
          }
        } else {
          // Tin nhắn của người khác
          if (canDeleteMessageForAll && onDeleteMessageForAll) {
            deleteLabel = 'Xóa tin nhắn này'; // Admin xóa thật
            deleteAction = () => onDeleteMessageForAll(msg._id);
          } else {
            deleteLabel = 'Xóa chỉ ở phía tôi'; // User thường ẩn khỏi bên mình
          }

          items.push({
            key: 'delete',
            icon: <DeleteOutlined />,
            label: deleteLabel,
            onClick: deleteAction,
          });
        }
      }

      return items;
    }, [
      canRecallMessage,
      canDeleteMessage,
      canDeleteMessageForAll,
      currentUser?._id,
      msg.senderId?._id,
      msg.recalled,
      msg._id,
      conversation?.createdBy,
      onRecallMessage,
      onDeleteMessage,
      onDeleteMessageForAll,
    ]);

    const messageTime = useMemo(() => {
      return new Date(msg.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }, [msg.createdAt]);

    const messageContent = useMemo(() => {
      if (isMessageRecalled) {
        return (
          <div className={styles.content}>
            <span className={styles.recalledMessage}>
              <RollbackOutlined style={{ marginRight: 4, fontSize: 12 }} />
              Tin nhắn đã được thu hồi
            </span>
          </div>
        );
      }

      if (isMessageDeletedForAll) {
        return (
          <div className={styles.content}>
            <span className={styles.deletedMessage}>
              <DeleteOutlined style={{ marginRight: 4, fontSize: 12 }} />
              Tin nhắn đã bị xóa
            </span>
          </div>
        );
      }

      if (
        msg.mediaUrl &&
        msg.mimetype &&
        !msg.mimetype.startsWith('image/') &&
        !msg.mimetype.startsWith('video/')
      ) {
        return (
          <div>
            <div className={styles.fileBox}>
              <div className={styles.fileInfo}>
                <div className={styles.fileIcon}>{getFileExtIcon(msg.originalName || '')}</div>
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
            {msg.content && (
              <div className={styles.content} style={{ marginTop: 4 }}>
                {msg.content}
              </div>
            )}
          </div>
        );
      }

      if (msg.mediaUrl && msg.mimetype && msg.mimetype.startsWith('image/')) {
        return (
          <div>
            <Image
              src={msg.mediaUrl}
              preview={{ mask: null }}
              style={{
                maxWidth: 220,
                borderRadius: 8,
                marginBottom: 4,
                display: 'block',
              }}
            />
            {msg.content && (
              <div className={styles.content} style={{ marginTop: 4 }}>
                {msg.content}
              </div>
            )}
          </div>
        );
      }

      if (msg.mediaUrl && msg.mimetype && msg.mimetype.startsWith('video/')) {
        return (
          <div>
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
            {msg.content && (
              <div className={styles.content} style={{ marginTop: 4 }}>
                {msg.content}
              </div>
            )}
          </div>
        );
      }
      return <div className={styles.content}>{msg.content}</div>;
    }, [
      isMessageRecalled,
      isMessageDeletedForAll,
      msg.mediaUrl,
      msg.mimetype,
      msg.originalName,
      msg.content,
      getFileExtIcon,
    ]);

    const seenIndicator = useMemo(() => {
      if (!isSeen) return null;

      return (
        <span className={styles.seen}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M7.5 13.5L4 10L2.5 11.5L7.5 16.5L17.5 6.5L16 5L7.5 13.5Z" fill="#1890ff" />
            <path
              d="M11.5 13.5L8 10L6.5 11.5L11.5 16.5L19.5 8.5L18 7L11.5 13.5Z"
              fill="#1890ff"
              fillOpacity="0.5"
            />
          </svg>
          Đã xem
        </span>
      );
    }, [isSeen]);

    // Fallback nếu không có senderId
    if (!msg.senderId) {
      console.error('MessageItem: No senderId found for message:', msg);
      return null;
    }

    return (
      <div className={`${styles.messageWrapper} ${isMe ? styles.me : styles.other}`}>
        {!isMe && (
          <img
            src={avatar || '/avtDefault.png'}
            alt="avatar"
            className={styles.avatar}
            onClick={() => onAvatarClick && msg.senderId && onAvatarClick(msg.senderId)}
            style={{ cursor: 'pointer' }}
          />
        )}
        <div className={styles.message}>
          {/* Hiển thị tên người gửi trong nhóm chat */}
          {isGroup && senderName && <div className={styles.senderName}>{senderName}</div>}
          {/* * Message content * */}
          {messageContent}
          <div className={styles.time}>
            {messageTime}
            {seenIndicator}
          </div>
        </div>

        {/* Message actions dropdown */}
        <Dropdown
          menu={{ items: messageActions }}
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
      </div>
    );
  },
  // Custom comparison function để tối ưu re-render
  (prevProps, nextProps) => {
    // Chỉ re-render nếu các props quan trọng thay đổi
    return (
      prevProps.msg._id === nextProps.msg._id &&
      prevProps.msg.content === nextProps.msg.content &&
      prevProps.msg.recalled === nextProps.msg.recalled &&
      prevProps.msg.deletedForAll === nextProps.msg.deletedForAll &&
      prevProps.isMe === nextProps.isMe &&
      prevProps.isSeen === nextProps.isSeen &&
      prevProps.isLastMyMessage === nextProps.isLastMyMessage &&
      prevProps.isGroup === nextProps.isGroup &&
      prevProps.currentUser?._id === nextProps.currentUser?._id
    );
  }
);

MessageItem.displayName = 'MessageItem';

export default MessageItem;
