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
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDebounce } from '@/hooks/hookCustoms';
import { useLoading } from '@/components/common';
import styles from './ChatListSidebar.module.scss';
import formatUpdatedAt from './format';

export default function ChatListSidebar() {
  const dispatch = useDispatch<AppDispatch>();
  const conversations = useSelector((state: RootState) => state.conversationReducer.conversations);
  const [searchText, setSearchText] = useState('');
  const searchResults = useSelector((state: RootState) => state.conversationReducer.searchResults);

  // Sử dụng useLoading hook
  const { loading: isSearching, withLoading: withSearch } = useLoading();
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const currentUser = useSelector((state: RootState) => state.userReducer.user);
  const selectedUser = useSelector((state: RootState) => state.userReducer.selectedUser);
  const userStatuses = useSelector((state: RootState) => state.userStatusReducer.statuses);

  const handleSearch = withSearch(async (value: string) => {
    if (!value.trim()) {
      return;
    }

    const isEmail = (str: string) => /\S+@\S+\.\S+/.test(str);

    if (isEmail(value)) {
      const result = await dispatch(searchUserByEmail(value));
      const user =
        typeof result.payload === 'object' && result.payload && '_id' in result.payload
          ? result.payload
          : null;
      if (user) {
        const existing = conversations.find((c) => c.receiver?._id === user._id);
        if (existing) {
          dispatch(setSelectedConversation(existing));
        } else {
          dispatch(setUserSelected(user));
        }
      } else {
        dispatch(setSelectedUser(null));
      }
    } else {
      await dispatch(searchConversation(value));
    }
  });

  // Debounce search với hook
  const debouncedSearch = useDebounce(handleSearch, 300);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchText(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleSelectUser = useCallback(
    (user: UserType) => {
      dispatch(setSelectedUser(user));
      const existing = conversations.find((c) => c.receiver?._id === user._id);
      if (existing) {
        dispatch(setSelectedConversation(existing));
      } else {
        dispatch(setSelectedConversation(null));
      }
    },
    [dispatch, conversations]
  );

  const handleSelect = useCallback(
    (id: string) => {
      const conversation = conversations.find((c) => c._id === id);
      if (conversation) {
        dispatch(setSelectedConversation(conversation));

        if (conversation.isGroup) {
          // Nhóm chat: không set selectedUser
          dispatch(setSelectedUser(null));
        } else if (conversation.receiver) {
          // 1-1 chat: set selectedUser
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
      }
    },
    [dispatch, conversations]
  );

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

  const isEmail = useCallback((str: string) => /\S+@\S+\.\S+/.test(str), []);
  const isEmailSearch = useMemo(() => isEmail(searchText), [isEmail, searchText]);

  const listData = useMemo(() => {
    if (isSearching) return [];
    if (isEmailSearch) return selectedUser ? [selectedUser] : [];
    if (searchText) return searchResults;

    const userId = currentUser?._id || '';
    const filteredConversations = conversations.filter(
      (c) => !c.deletedBy || !c.deletedBy.includes(userId)
    );

    // Sắp xếp theo updatedAt (tin nhắn mới nhất lên đầu)
    const sortedConversations = filteredConversations.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      return dateB - dateA; // Giảm dần (mới nhất lên đầu)
    });

    return sortedConversations;
  }, [
    isSearching,
    isEmailSearch,
    selectedUser,
    searchText,
    searchResults,
    currentUser?._id,
    conversations,
  ]);

  return (
    <div className={styles.chatListSidebar}>
      <div className={styles.header}>
        <Input.Search
          placeholder="Tìm kiếm"
          value={searchText}
          onChange={(e) => handleSearchInput(e.target.value)}
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
                if (!item.isGroup && !item.lastMessage && item.username) {
                  return (
                    <List.Item
                      onClick={() => handleSelectUser(item)}
                      className={styles.userSearchResult}
                    >
                      <div className={styles.avatarContainer}>
                        <img
                          src={item.avatar || '/avtDefault.png'}
                          alt="avatar"
                          className={styles.avatar}
                        />
                        {/* Hiển thị trạng thái online cho search results */}
                        <div
                          className={`online-status small ${userStatuses[item._id]?.isOnline ? 'online' : 'offline'}`}
                        />
                      </div>
                      <div className={styles.userInfo}>
                        <div className={styles.name}>{item.nickname || item.username}</div>
                        <div className={styles.email}>{item.email || item.username}</div>
                      </div>
                    </List.Item>
                  );
                }

                // Xử lý hiển thị cho cả 1-1 và nhóm chat
                let displayName = '';
                let displayAvatar = '';

                if (item.isGroup) {
                  // Nhóm chat
                  displayName = item.name || '';
                  displayAvatar = item.avatar || '/avtDefault.png';
                } else {
                  // 1-1 chat
                  const receiver = item.memberPreviews?.find(
                    (user: any) => user._id !== currentUser?._id
                  );
                  displayName = receiver ? receiver.nickname || receiver.username : '';
                  displayAvatar = receiver ? receiver.avatar : '/avtDefault.png';
                }

                return (
                  <List.Item
                    className={`${styles.chatItem} ${selectedConversation?._id === item._id ? styles.active : ''}`}
                    onClick={() => handleSelect(item._id)}
                  >
                    <div className={styles.avatarContainer}>
                      <img
                        src={displayAvatar || '/avtDefault.png'}
                        alt="avatar"
                        className={styles.avatar}
                      />
                      {/* Hiển thị trạng thái online cho chat 1-1 */}
                      {!item.isGroup &&
                        (() => {
                          const receiver = item.memberPreviews?.find(
                            (user: any) => user._id !== currentUser?._id
                          );
                          const receiverId = receiver?._id;
                          const isOnline = receiverId ? userStatuses[receiverId]?.isOnline : false;

                          return (
                            <div
                              className={`online-status small ${isOnline ? 'online' : 'offline'}`}
                            />
                          );
                        })()}
                      {/* Hiển thị dấu xanh cho nhóm khi có thành viên online */}
                      {item.isGroup &&
                        (() => {
                          const onlineCount =
                            item.members?.filter(
                              (memberId: string) =>
                                memberId !== currentUser?._id && userStatuses[memberId]?.isOnline
                            ).length || 0;

                          return onlineCount > 0 ? (
                            <div className="online-status small online" />
                          ) : null;
                        })()}
                    </div>
                    <div className={styles.chatInfo}>
                      <div className={styles.name}>{displayName}</div>
                      <div className={styles.message}>
                        {(() => {
                          // Kiểm tra nếu có lastMessageType hoặc lastMessage
                          if (!item.lastMessageType && !item.lastMessage) return '';

                          const isCurrentUserMessage =
                            item.lastMessageSenderId === currentUser?._id;
                          const prefix = isCurrentUserMessage ? 'Bạn: ' : '';

                          if (item.lastMessageType === 'image') {
                            return `${prefix}Đã gửi 1 ảnh`;
                          } else if (item.lastMessageType === 'video') {
                            return `${prefix}Đã gửi 1 video`;
                          } else if (item.lastMessageType === 'file') {
                            return `${prefix}Đã gửi 1 file`;
                          } else {
                            return `${prefix}${item.lastMessage}`;
                          }
                        })()}
                      </div>
                    </div>
                    <div className={styles.rightContent}>
                      <div className={styles.time}>
                        {item.updatedAt ? formatUpdatedAt(item.updatedAt) : ''}
                      </div>
                      <DeleteOutlined
                        className={styles.deleteIcon}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(item._id);
                        }}
                      />
                    </div>
                  </List.Item>
                );
              }}
            />
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
