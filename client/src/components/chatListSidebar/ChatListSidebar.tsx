'use client';
import { useDebounce } from '@/hooks/hookCustoms';
import { AppDispatch, RootState } from '@/lib/store';
import {
  fetchConversations,
  searchConversation,
  setSelectedConversation,
  setSelectedUser,
} from '@/lib/store/reducer/conversationSlice/conversationSlice';
import {
  searchUserByEmail,
  setSelectedUser as setUserSelected,
} from '@/lib/store/reducer/user/userSlice';
import { UserType } from '@/types';
import { LoadingOutlined } from '@ant-design/icons';
import { Input, List, Spin } from 'antd';
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
  const selectedUser = useSelector((state: RootState) => state.userReducer.selectedUser);

  const searchUsers = useDebounce(async (value: string) => {
    if (!value.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
  }, 300);

  const handleSearch = async (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setIsSearching(false);
      return;
    }

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
            // Chưa có, cho phép tạo mới
            dispatch(setUserSelected(user));
            dispatch(setSelectedConversation(null));
          }
        } else {
          // Không tìm thấy user, có thể hiển thị thông báo
          dispatch(setUserSelected(null));
          dispatch(setSelectedConversation(null));
        }
        setIsSearching(false);
      } catch (err) {
        dispatch(setUserSelected(null));
        dispatch(setSelectedConversation(null));
        setIsSearching(false);
      }
    } else {
      // Tìm kiếm hội thoại theo name
      dispatch(searchConversation(value));
      setIsSearching(true);
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

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  const isEmail = (str: string) => /\S+@\S+\.\S+/.test(str);

  const listData = isSearching
    ? searchResults
    : isEmail(searchText)
      ? selectedUser
        ? [selectedUser]
        : []
      : conversations;

  return (
    <div className={styles.chatListSidebar}>
      <div className={styles.header}>
        <Input.Search
          placeholder="Tìm kiếm hội thoại"
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        {isSearching && <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />}
      </div>

      <div className={styles.chatList}>
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
                      <div className={styles.name}>{item.username}</div>
                      <div className={styles.email}>{item.email}</div>
                    </div>
                  </div>
                </List.Item>
              );
            }
            // Nếu là hội thoại
            return (
              <List.Item>
                <div
                  key={item._id}
                  className={`${styles.chatItem} ${selectedConversation?._id === item._id ? styles.active : ''}`}
                  onClick={() => handleSelect(item._id)}
                >
                  <img
                    src={
                      item.isGroup
                        ? item.avatar // Avatar nhóm
                        : item.receiver?.avatar // Avatar người nhận 1-1
                    }
                    alt="avatar"
                    className={styles.avatar}
                  />
                  <div className={styles.chatInfo}>
                    <div className={styles.name}>
                      {item.isGroup ? item.avatar : item.receiver?.username}
                    </div>
                    <div className={styles.message}>{item.lastMessage}</div>
                  </div>
                  <div className={styles.time}>
                    {item.updatedAt ? formatUpdatedAt(item.updatedAt) : ''}
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      </div>
    </div>
  );
}
