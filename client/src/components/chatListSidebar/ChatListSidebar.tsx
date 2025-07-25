'use client';
import { AppDispatch, RootState } from '@/lib/store';
import {
  fetchConversations,
  searchConversation,
  setSelectedConversation,
  setSelectedUser,
  deleteConversationForUser,
} from '@/lib/store/reducer/conversationSlice/conversationSlice';
import {
  searchUserByEmail,
  setSelectedUser as setUserSelected,
} from '@/lib/store/reducer/user/userSlice';
import { UserType } from '@/types';
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { Input, List, Skeleton, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './ChatListSidebar.module.scss';
import formatUpdatedAt from './format';

export default function ChatListSidebar() {
  const dispatch = useDispatch<AppDispatch>();
  const conversations = useSelector((state: RootState) => state.conversationReducer.conversations);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchResults = useSelector((state: RootState) => state.conversationReducer.searchResults);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const currentUser = useSelector((state: RootState) => state.userReducer.user);
  const selectedUser = useSelector((state: RootState) => state.userReducer.selectedUser);

  const handleSearch = async (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true); // Bắt đầu loading
    // Hàm kiểm tra có phải email không
    const isEmail = (str: string) => /\S+@\S+\.\S+/.test(str);

    if (isEmail(value)) {
      // Tìm user theo email bằng thunk
      try {
        const result = await dispatch(searchUserByEmail(value));
        const user =
          typeof result.payload === 'object' && result.payload && '_id' in result.payload
            ? result.payload
            : null;
        if (user) {
          // Kiểm tra đã có conversation với user này chưa
          const existing = conversations.find((c) => c.receiver?._id === user._id);
          if (existing) {
            dispatch(setSelectedConversation(existing));
          } else {
            // Chưa có, chỉ setSelectedUser, KHÔNG setSelectedConversation(null)
            dispatch(setUserSelected(user));
          }
        } else {
          // Không tìm thấy user, chỉ setSelectedUser(null)
          dispatch(setSelectedUser(null));
        }
      } catch (err) {
        dispatch(setSelectedUser(null));
      } finally {
        setIsSearching(false); // Kết thúc loading
      }
    } else {
      // Tìm kiếm hội thoại theo name
      try {
        await dispatch(searchConversation(value));
      } finally {
        setIsSearching(false); // Kết thúc loading
      }
    }
  };

  // 🔐 chọn user
  const handleSelectUser = (user: UserType) => {
    // Cập nhật user đang chọn vào Redux
    dispatch(setSelectedUser(user));
    // Tìm conversation đã có với user này
    const existing = conversations.find((c) => c.receiver?._id === user._id);
    if (existing) {
      dispatch(setSelectedConversation(existing));
    } else {
      dispatch(setSelectedConversation(null)); // Chưa có, chỉ hiện khung trắng
    }
  };

  // 🔐 chọn conversation
  const handleSelect = (id: string) => {
    const conversation = conversations.find((c) => c._id === id);
    if (conversation && conversation.receiver) {
      dispatch(setSelectedConversation(conversation));
      // Ép receiver về UserType, chỉ lấy các trường hợp lệ
      const receiver: UserType = {
        _id: conversation.receiver._id || '',
        username: conversation.receiver.username || '',
        avatar: conversation.receiver.avatar || '',
        online:
          typeof (conversation.receiver as any).online === 'boolean'
            ? (conversation.receiver as any).online
            : false,
      };
      dispatch(setSelectedUser(receiver));
    }
  };

  // Hàm xoá hội thoại
  const handleDeleteConversation = (conversationId: string) => {
    Modal.confirm({
      title: 'Xác nhận xoá hội thoại',
      content:
        'Bạn có chắc chắn muốn xoá đoạn hội thoại này? Đoạn chat sẽ bị ẩn khỏi danh sách của bạn.',
      okText: 'Xoá',
      cancelText: 'Huỷ',
      onOk: async () => {
        try {
          await dispatch<any>(deleteConversationForUser(conversationId));
          message.success('Đã xoá hội thoại!');
        } catch {
          message.error('Xoá hội thoại thất bại!');
        }
      },
    });
  };

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  const isEmail = (str: string) => /\S+@\S+\.\S+/.test(str);

  const isEmailSearch = isEmail(searchText);

  function getListData() {
    if (isSearching) return [];
    if (isEmailSearch) return selectedUser ? [selectedUser] : [];
    if (searchText) return searchResults;
    // Ẩn các conversation mà deletedBy chứa user hiện tại
    const userId = currentUser?._id || '';
    return conversations.filter((c) => !c.deletedBy || !c.deletedBy.includes(userId));
  }
  const listData = getListData();

  return (
    <div className={styles.chatListSidebar}>
      <div className={styles.header}>
        <Input.Search
          placeholder="Tìm kiếm"
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        {isSearching && (
          <div>
            {[...Array(4)].map((_, idx) => (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }} key={idx}>
                <Skeleton.Avatar active size="large" shape="circle" style={{ marginRight: 12 }} />
                <Skeleton
                  active
                  title={false}
                  paragraph={{ rows: 2, width: ['60%', '40%'] }}
                  style={{ flex: 1 }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.chatList}>
        {isSearching ? (
          <div>
            {[...Array(4)].map((_, idx) => (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }} key={idx}>
                <Skeleton.Avatar active size="large" shape="circle" style={{ marginRight: 12 }} />
                <Skeleton
                  active
                  title={false}
                  paragraph={{ rows: 2, width: ['60%', '40%'] }}
                  style={{ flex: 1 }}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            <List
              dataSource={listData}
              renderItem={(item: any) => {
                // Nếu là user tìm theo email (không có isGroup)
                if (!item.isGroup && !item.lastMessage && item.email) {
                  return (
                    <List.Item onClick={() => handleSelectUser(item)}>
                      <div className={styles.userSearchResult}>
                        <img
                          src={item.avatar || '/avtDefault.png'}
                          alt="avatar"
                          className={styles.avatar}
                        />
                        <div className={styles.userInfo}>
                          <div className={styles.name}>{item.nickname || item.username}</div>
                          <div className={styles.email}>{item.email}</div>
                        </div>
                      </div>
                    </List.Item>
                  );
                }
                // Nếu là hội thoại
                // Lấy tên và avatar người nhận từ memberPreviews (khác currentUser._id)
                const receiver = item.memberPreviews?.find(
                  (user: any) => user._id !== currentUser?._id
                );
                const receiverName = receiver ? receiver.nickname || receiver.username : '';
                const receiverAvatar = receiver ? receiver.avatar : '';
                return (
                  <List.Item
                    actions={[
                      <DeleteOutlined
                        key="delete"
                        style={{ color: '#ff4d4f' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(item._id);
                        }}
                      />,
                    ]}
                    onClick={() => handleSelect(item._id)}
                  >
                    <img
                      src={receiverAvatar || '/avtDefault.png'}
                      alt="avatar"
                      className={styles.avatar}
                    />
                    <div className={styles.chatInfo}>
                      <div className={styles.name}>{receiverName}</div>
                      <div className={styles.message}>{item.lastMessage}</div>
                    </div>
                    <div className={styles.time}>
                      {item.updatedAt ? formatUpdatedAt(item.updatedAt) : ''}
                    </div>
                  </List.Item>
                );
              }}
            />
            {/* Thông báo không tìm thấy người dùng khi tìm kiếm bằng email */}
            {searchText && isEmailSearch && listData.length === 0 && (
              <div className={styles.notFoundBlock}>
                <div className={styles.notFoundIcon}>
                  <SearchOutlined />
                </div>
                <div className={styles.notFoundTitle}>Không tìm thấy người dùng</div>
                <div className={styles.notFoundDesc}>email chưa đăng ký tài khoản.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
