import LastSeenDisplay from '@/lib/format';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchUserStatus } from '@/lib/store/reducer/userStatus/userStatusSlice';
import { PhoneOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Avatar, Button } from 'antd';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './ChatHeader.module.scss';

export default function ChatHeader({ onAvatarClick }: { onAvatarClick?: (user: any) => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const selectedUser = useSelector((state: RootState) => state.conversationReducer.selectedUser);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const currentUser = useSelector((state: RootState) => state.userReducer.user);
  const userId = selectedUser?._id;
  const userStatus = useSelector((state: RootState) =>
    userId ? state.userStatusReducer.statuses[userId] : undefined
  );
  const receiver = selectedConversation?.memberPreviews?.find(
    (user: any) => user._id !== currentUser?._id
  );

  const receiverName = receiver ? receiver.nickname || receiver.username : '';

  const receiverAvatar = receiver ? receiver.avatar : '';

  useEffect(() => {
    if (selectedUser) {
      dispatch(fetchUserStatus(selectedUser._id));
    }
  }, [selectedUser]);
  if (!selectedUser && !selectedConversation) return null;
  return (
    <div className={styles.chatHeader}>
      <div className={styles.left}>
        <Avatar
          src={receiverAvatar}
          size="large"
          onClick={() => onAvatarClick && receiver && onAvatarClick(receiver)}
          style={{ cursor: 'pointer' }}
        />
        <div className={styles.info}>
          <div className={styles.name}>{receiverName}</div>
          <div className={styles.status}>
            {!selectedConversation ? (
              'Không rõ'
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
    </div>
  );
}
