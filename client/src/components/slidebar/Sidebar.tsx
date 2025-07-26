import { AppDispatch, RootState } from '@/lib/store';
import { logout } from '@/lib/store/reducer/user/userSlice';
import { UserType } from '@/types';
import {
  InfoCircleOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Dropdown, Image } from 'antd';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ChatListSidebar from '../chatListSidebar/ChatListSidebar';
import CreateGroupModal from '../createGroup/CreateGroupModal';
import styles from './Sidebar.module.scss';

export default function Sidebar({ onAvatarClick }: { onAvatarClick?: (user: UserType) => void }) {
  const user = useSelector((state: RootState) => state.userReducer.user);
  const dispach = useDispatch<AppDispatch>();
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  const handelLogout = () => {
    dispach(logout());
  };

  const items = [
    {
      key: 'profile',
      icon: <InfoCircleOutlined />,
      label: 'Thông tin tài khoản',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
    },
  ];

  return (
    <div>
      <div className={styles.sidebar}>
        <div className={styles.sidebarLeft}>
          <ul className={styles.sidebarLeftTop}>
            <li className={styles.avatar}>
              <Dropdown
                menu={{
                  items,
                  onClick: ({ key }) => {
                    if (key === 'profile' && onAvatarClick && user)
                      onAvatarClick({ ...user, online: true });
                    if (key === 'logout') handelLogout();
                  },
                }}
                trigger={['click']}
                placement="bottomLeft"
              >
                <Image
                  className={styles.imageAvatar}
                  alt="avata"
                  preview={false}
                  src={user?.avatar || '/avtDefault.png'}
                  style={{ cursor: 'pointer' }}
                />
              </Dropdown>
            </li>
            <li className={styles.menuItem} onClick={() => setShowCreateGroupModal(true)}>
              <UsergroupAddOutlined />
            </li>
            <li className={styles.menuItem}>
              <QuestionCircleOutlined />
            </li>
          </ul>
          <ul className={styles.sidebarLeftTop}>
            <li className={styles.menuItem} onClick={() => handelLogout()}>
              <LogoutOutlined />
            </li>
          </ul>
        </div>
        <div className={styles.sidebarRight}>
          <ChatListSidebar />
        </div>
      </div>

      <CreateGroupModal
        visible={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
      />
    </div>
  );
}
