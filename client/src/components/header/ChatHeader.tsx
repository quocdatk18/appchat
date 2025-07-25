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
  const currentUser = useSelector((state: RootState) => state.userReducer.user);
  console.log('currentUser', currentUser);
  const userId = selectedUser?._id;
  const userStatus = useSelector((state: RootState) =>
    userId ? state.userStatusReducer.statuses[userId] : undefined
  );
  const receiver = selectedConversation?.memberPreviews?.find(
    (user: any) => user._id !== currentUser?._id
  );

  const receiverName = receiver ? receiver.username : '';
  const receiverAvatar = receiver ? receiver.avatar : '';
  console.log('selectedConversation', selectedConversation);
  console.log('receiverName', receiverName);
  useEffect(() => {
    if (selectedUser) {
      dispatch(fetchUserStatus(selectedUser._id));
    }
  }, [selectedUser]);
  if (!selectedUser && !selectedConversation) return null;
  return (
    <div className={styles.chatHeader}>
      <div className={styles.left}>
        <Avatar src={receiverAvatar} size="large" />
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
