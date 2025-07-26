import LastSeenDisplay from '@/lib/format';
import { AppDispatch, RootState } from '@/lib/store';

import { PhoneOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Avatar, Button } from 'antd';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import GroupInfoModal from '../groupInfo/GroupInfoModal';
import styles from './ChatHeader.module.scss';

export default function ChatHeader({ onAvatarClick }: { onAvatarClick?: (user: any) => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const selectedUser = useSelector((state: RootState) => state.conversationReducer.selectedUser);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
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

  // Force re-render khi userStatus thay đổi
  const userStatuses = useSelector((state: RootState) => state.userStatusReducer.statuses);

  // Không cần fetch status nữa vì đã có Socket realtime

  if (!selectedUser && !selectedConversation) return null;

  return (
    <div className={styles.chatHeader}>
      <div className={styles.left}>
        <div className={styles.avatarContainer}>
          <Avatar
            src={displayAvatar || '/avtDefault.png'}
            size="large"
            onClick={() => {
              if (isGroup) {
                setShowGroupInfoModal(true);
              } else if (onAvatarClick && displayUser) {
                onAvatarClick(displayUser);
              }
            }}
            style={{ cursor: 'pointer' }}
          />
          {/* Hiển thị trạng thái online cho chat 1-1 */}
          {!isGroup && userStatus && (
            <div className={`online-status medium ${userStatus.isOnline ? 'online' : 'offline'}`} />
          )}
          {/* Hiển thị dấu xanh cho nhóm khi có thành viên online */}
          {isGroup && onlineMembersCount > 0 && <div className="online-status medium online" />}
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
