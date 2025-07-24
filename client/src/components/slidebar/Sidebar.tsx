import { Image } from 'antd';
import { ContactsOutlined, MessageOutlined, LogoutOutlined } from '@ant-design/icons';
import styles from './Sidebar.module.scss';
import ChatListSidebar from '../chatListSidebar/ChatListSidebar';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { logout } from '@/lib/store/reducer/user/userSlice';
export default function Sidebar() {
  const user = useSelector((state: RootState) => state.userReducer.user);
  const dispach = useDispatch<AppDispatch>();
  const handelLogout = () => {
    dispach(logout());
  };
  return (
    <div>
      <div className={styles.sidebar}>
        <div className={styles.sidebarLeft}>
          <ul className={styles.sidebarLeftTop}>
            <li className={styles.avatar}>
              <Image
                className={styles.imageAvatar}
                alt="avata"
                preview={false}
                src={user?.avatar || '/avtDefault.png'}
              />
            </li>
            <li className={styles.menuItem}>
              <MessageOutlined />
            </li>
            <li className={styles.menuItem}>
              <ContactsOutlined />
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
    </div>
  );
}
