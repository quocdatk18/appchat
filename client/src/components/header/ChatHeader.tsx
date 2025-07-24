import { Avatar, Button } from 'antd';
import { PhoneOutlined, VideoCameraOutlined } from '@ant-design/icons';
import styles from './ChatHeader.module.scss';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchUserStatus } from '@/lib/store/reducer/userStatus/userStatusSlice';
import { useEffect } from 'react';
import LastSeenDisplay from '@/lib/format';

export default function ChatHeader() {
  const dispatch = useDispatch<AppDispatch>();
  const selectedUser = useSelector((state: RootState) => state.conversationReducer.selectedUser);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const userId = selectedUser?._id;
  const userStatus = useSelector((state: RootState) =>
    userId ? state.userStatusReducer.statuses[userId] : undefined
  );
  useEffect(() => {
    if (selectedUser) {
      dispatch(fetchUserStatus(selectedUser._id));
    }
  }, [selectedUser]);
  if (!selectedUser) return null;
  return (
    <div className={styles.chatHeader}>
      <div className={styles.left}>
        <Avatar src={selectedUser.avatar} size="large" />
        <div className={styles.info}>
          <div className={styles.name}>{selectedUser.username}</div>
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
