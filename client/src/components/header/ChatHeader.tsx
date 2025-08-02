import LastSeenDisplay from '@/lib/format';
import { AppDispatch, RootState } from '@/lib/store';
import { getUserById } from '@/lib/store/reducer/user/userSlice';

import { PhoneOutlined, VideoCameraOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Avatar, Button, notification } from 'antd';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import GroupInfoModal from '../groupInfo/GroupInfoModal';
import styles from './ChatHeader.module.scss';
import dayjs from 'dayjs';

export default function ChatHeader({
  onAvatarClick,
  onBackClick,
}: {
  onAvatarClick?: (user: any) => void;
  onBackClick?: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const selectedUser = useSelector((state: RootState) => state.userReducer.selectedUser);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const deactivatedAt = selectedConversation?.deactivatedAt;

  const currentUser = useSelector((state: RootState) => state.userReducer.user);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);

  // Xác định thông tin hiển thị
  let displayUser = selectedUser;
  let displayName = '';
  let displayAvatar = '';
  let isGroup = false;

  if (selectedConversation) {
    isGroup = selectedConversation.isGroup;

    if (isGroup) {
      // Nhóm chat: hiển thị tên nhóm
      displayName = selectedConversation.name || '';
      displayAvatar = selectedConversation.avatar || '';
    } else {
      // 1-1 chat: hiển thị thông tin receiver
      const receiver = selectedConversation.receiver;
      if (receiver) {
        displayUser = receiver;
        displayName = receiver.nickname || receiver.username;
        displayAvatar = receiver.avatar || '';
      } else if (selectedUser) {
        // Fallback: sử dụng selectedUser nếu receiver không có thông tin
        displayUser = selectedUser;
        displayName = selectedUser.nickname || selectedUser.username;
        displayAvatar = selectedUser.avatar || '';
      }
    }
  } else if (selectedUser) {
    // Khi tìm user mới
    displayName = selectedUser.nickname || selectedUser.username;
    displayAvatar = selectedUser.avatar || '';
  }

  const userId = displayUser?._id;
  const userStatus = useSelector((state: RootState) =>
    userId ? state.userStatusReducer.statuses[userId] : undefined
  );

  // Đếm số thành viên online trong nhóm (trừ current user)
  const onlineMembersCount = useSelector((state: RootState) => {
    if (!isGroup || !selectedConversation?.members) return 0;

    const userStatuses = state.userStatusReducer.statuses;
    const onlineCount = selectedConversation.members.filter(
      (memberId) => memberId !== currentUser?._id && userStatuses[memberId]?.isOnline
    ).length;

    return onlineCount;
  });
  function formatDate(dateString: string) {
    return dayjs(dateString).format('HH:mm DD/MM/YYYY');
  }

  if (!selectedUser && !selectedConversation) return null;

  return (
    <div className={styles.chatHeader}>
      <div className={styles.left}>
        {/* Nút Back cho mobile */}
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={onBackClick}
          className={styles.backButton}
        />
        <div
          className={styles.avatarContainer}
          style={{ position: 'relative', display: 'inline-block' }}
        >
          <Avatar
            src={displayAvatar || '/avtDefault.png'}
            size="large"
            onClick={async () => {
              if (isGroup) {
                deactivatedAt
                  ? notification.warning({
                      message: 'Nhóm đã giải tán từ ' + formatDate(deactivatedAt),
                    })
                  : setShowGroupInfoModal(true);
              } else if (onAvatarClick && displayUser) {
                // Fetch đầy đủ thông tin user trước khi mở profile
                try {
                  const result = await dispatch(getUserById(displayUser._id));
                  if (getUserById.fulfilled.match(result)) {
                    onAvatarClick(result.payload);
                  } else {
                    onAvatarClick(displayUser);
                  }
                } catch (error) {
                  onAvatarClick(displayUser);
                }
              }
            }}
            style={{ cursor: 'pointer', display: 'block' }}
          />
          {/* Hiển thị trạng thái online cho chat 1-1 */}
          {!isGroup && userStatus && (
            <span
              className={`online-status medium ${userStatus.isOnline ? 'online' : 'offline'}`}
              style={{ position: 'absolute', bottom: 2, right: 2, zIndex: 2 }}
            />
          )}
          {/* Hiển thị dấu xanh cho nhóm khi có thành viên online */}
          {isGroup && onlineMembersCount > 0 && (
            <span
              className="online-status medium online"
              style={{ position: 'absolute', bottom: 2, right: 2, zIndex: 2 }}
            />
          )}
        </div>
        <div className={styles.info}>
          <div className={styles.name}>{displayName}</div>
          <div className={styles.status}>
            {isGroup ? (
              `${onlineMembersCount} thành viên đang hoạt động`
            ) : userStatus?.isOnline ? (
              'Đang hoạt động'
            ) : (
              <LastSeenDisplay lastSeen={userStatus?.lastSeen ?? null} />
            )}
          </div>
        </div>
      </div>
      <div className={styles.right}>
        <Button icon={<PhoneOutlined />} />
        <Button icon={<VideoCameraOutlined />} />
      </div>

      {/* Modal thông tin nhóm */}
      <GroupInfoModal
        visible={showGroupInfoModal}
        onClose={() => setShowGroupInfoModal(false)}
        conversationId={selectedConversation?._id || ''}
      />
    </div>
  );
}
