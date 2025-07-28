import { AppDispatch, RootState } from '@/lib/store';
import { logout } from '@/lib/store/reducer/user/userSlice';
import { clearAllUserStatus } from '@/lib/store/reducer/userStatus/userStatusSlice';
import { UserType } from '@/types';
import {
  CustomerServiceOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Dropdown, Image } from 'antd';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ChatListSidebar from '../chatListSidebar/ChatListSidebar';
import CreateGroupModal from '../createGroup/CreateGroupModal';
import UserProfileModal from '../userProfile/UserProfileModal';
import CustomerServiceModal from './CustomerServiceModal';
import styles from './Sidebar.module.scss';

export default function Sidebar({ onAvatarClick }: { onAvatarClick?: (user: UserType) => void }) {
  const user = useSelector((state: RootState) => state.userReducer.user);
  const dispach = useDispatch<AppDispatch>();
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showCustomerServiceModal, setShowCustomerServiceModal] = useState(false);

  const handelLogout = () => {
    dispach(logout());
    dispach(clearAllUserStatus());
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
            <li className={styles.menuItem} onClick={() => setShowChangePasswordModal(true)}>
              <SettingOutlined />
            </li>
            <li className={styles.menuItem} onClick={() => setShowCustomerServiceModal(true)}>
              <CustomerServiceOutlined />
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

      <UserProfileModal
        open={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        user={user ? { ...user, online: true } : null}
        isCurrentUser={true}
        mode="change-password"
      />

      <CustomerServiceModal
        open={showCustomerServiceModal}
        onClose={() => setShowCustomerServiceModal(false)}
      />
    </div>
  );
}
