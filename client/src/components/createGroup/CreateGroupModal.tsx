'use client';

import { AppDispatch, RootState } from '@/lib/store';
import { createConversation } from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { searchUsers } from '@/lib/store/reducer/user/userSlice';
import { UserType } from '@/types';
import { CameraOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Input, Modal, List, Avatar, Checkbox, message, Upload } from 'antd';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDebounce } from '@/hooks/hookCustoms';
import { LoadingOverlay, LoadingButton, useLoading } from '@/components/common';
import styles from './CreateGroupModal.module.scss';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'create' | 'add-members';
  onSuccess?: (selectedUsers: string[]) => void;
}

export default function CreateGroupModal({
  visible,
  onClose,
  mode = 'create',
  onSuccess,
}: CreateGroupModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.userReducer.user);
  const conversations = useSelector((state: RootState) => state.conversationReducer.conversations);

  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sử dụng useLoading hooks
  const { loading, withLoading } = useLoading();
  const { loading: uploading, withLoading: withUpload } = useLoading();

  // Lấy danh sách user từ conversations (đã chat trước đó)
  const availableUsers = useMemo(() => {
    const users: UserType[] = [];
    const seenUserIds = new Set<string>();

    conversations.forEach((conv) => {
      if (!conv.isGroup && conv.receiver) {
        const userId = conv.receiver._id;
        if (!seenUserIds.has(userId) && userId !== currentUser?._id) {
          users.push(conv.receiver);
          seenUserIds.add(userId);
        }
      }
    });

    return users;
  }, [conversations, currentUser?._id]);

  // Hàm tìm kiếm user từ Redux - memo hóa để tránh re-render
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const result = await dispatch(searchUsers(query));

        if (searchUsers.fulfilled.match(result)) {
          const data = result.payload;

          // Chỉ lọc bỏ current user, cho phép hiển thị user từ search ngay cả khi đã có trong conversations
          const filteredData = data.filter((user: UserType) => {
            const isNotCurrentUser = user._id !== currentUser?._id;
            return isNotCurrentUser;
          });
          setSearchResults(filteredData);
        }
      } finally {
        setIsSearching(false);
      }
    },
    [dispatch, currentUser?._id]
  );

  // Debounce search function - gọi ở top-level
  const debouncedSearch = useDebounce(handleSearch, 300);

  useEffect(() => {
    if (searchText.trim()) {
      debouncedSearch(searchText);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchText]);

  // Kết hợp users từ conversations và search results - memoized
  const allUsers = useMemo(
    () => [...availableUsers, ...searchResults],
    [availableUsers, searchResults]
  );

  const filteredUsers = useMemo(() => {
    if (!searchText.trim()) return allUsers;

    return allUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(searchText.toLowerCase()) ||
        user.nickname?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [allUsers, searchText]);

  const handleUserToggle = useCallback((userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  // Tạo nhóm hoặc thêm thành viên
  const handleCreateGroup = withLoading(async () => {
    if (mode === 'add-members') {
      if (selectedUsers.length < 1) {
        message.error('Vui lòng chọn ít nhất 1 người!');
        return;
      }

      // Gọi onSuccess nếu có (cho backward compatibility)
      if (onSuccess) {
        await onSuccess(selectedUsers);
      }

      // Đóng modal sau khi thêm thành viên
      onClose();
      return;
    }

    // Mode create group
    if (!groupName.trim()) {
      message.error('Vui lòng nhập tên nhóm!');
      return;
    }

    if (selectedUsers.length < 1) {
      message.error('Vui lòng chọn ít nhất 1 người!');
      return;
    }

    await dispatch(
      createConversation({
        receiverId: selectedUsers,
        isGroup: true,
        groupName: groupName.trim(),
        content: '',
        type: 'text',
        mediaUrl: groupAvatar, // Thêm avatar vào
      })
    );

    message.success('Tạo nhóm thành công!');
    onClose();
    setGroupName('');
    setGroupAvatar('');
    setSelectedUsers([]);
    setSearchText('');
  });

  const handleCancel = () => {
    onClose();
    setGroupName('');
    setGroupAvatar('');
    setSelectedUsers([]);
    setSearchText('');
  };

  // Upload avatar function
  const uploadAvatar = withUpload(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('http://localhost:5000/upload?type=avatar', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    const url = data.url;

    if (typeof url === 'string') {
      setGroupAvatar(url);
      return { url };
    } else {
      throw new Error('Không lấy được url ảnh');
    }
  });

  // Xử lý upload avatar
  const handleAvatarChange = (info: any) => {
    if (info.file.status === 'uploading') {
      // Upload status được handle bởi withUpload
    }
    if (info.file.status === 'done') {
      const url = info.file.response?.url;
      if (typeof url === 'string') {
        setGroupAvatar(url);
      } else {
        message.error('Upload trả về link không hợp lệ!');
      }
    }
    if (info.file.status === 'error') {
      message.error('Upload ảnh thất bại, hãy chọn lại ảnh khác hoặc thử lại sau!');
    }
  };

  const customRequest = async ({ file, onSuccess, onError }: any) => {
    try {
      const data = await uploadAvatar(file as File);
      onSuccess(data, file);
    } catch (err) {
      onError(err);
    }
  };

  return (
    <Modal
      title={mode === 'add-members' ? 'Thêm thành viên' : 'Tạo nhóm'}
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Hủy
        </Button>,
        <LoadingButton
          key="create"
          type="primary"
          onClick={handleCreateGroup}
          loading={loading}
          loadingText={mode === 'add-members' ? 'Đang thêm...' : 'Đang tạo nhóm...'}
          disabled={
            mode === 'add-members'
              ? selectedUsers.length < 1
              : !groupName.trim() || selectedUsers.length < 1
          }
        >
          {mode === 'add-members' ? 'Thêm thành viên' : 'Tạo nhóm'}
        </LoadingButton>,
      ]}
      width={600}
      destroyOnHidden
    >
      <div className={styles.createGroupModal}>
        {/* Avatar upload cho create mode */}
        {mode === 'create' && (
          <div className={styles.avatarSection}>
            <Upload
              name="file"
              customRequest={customRequest}
              onChange={handleAvatarChange}
              showUploadList={false}
              accept="image/*"
            >
              <div className={styles.avatarUpload}>
                <Avatar src={groupAvatar || '/avtDefault.png'} size={80} icon={<UserOutlined />} />
                <CameraOutlined className={styles.cameraIcon} />
              </div>
            </Upload>
          </div>
        )}

        {/* Group name input cho create mode */}
        {mode === 'create' && (
          <div className={styles.groupNameSection}>
            <Input
              placeholder="Nhập tên nhóm"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              size="large"
            />
          </div>
        )}

        {/* Search section */}
        <div className={styles.searchSection}>
          <Input
            placeholder="Tìm kiếm người dùng..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="large"
          />
        </div>

        {/* Users list */}
        <div className={styles.usersList}>
          <h4>Chọn thành viên ({selectedUsers.length})</h4>
          {isSearching ? (
            <div className={styles.loadingText}>Đang tìm kiếm...</div>
          ) : filteredUsers.length === 0 ? (
            <div className={styles.emptyText}>Không tìm thấy người dùng</div>
          ) : (
            <List
              dataSource={filteredUsers}
              renderItem={(user) => (
                <List.Item
                  key={user._id}
                  actions={[
                    <Checkbox
                      key="select"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleUserToggle(user._id)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar src={user.avatar} icon={<UserOutlined />} />}
                    title={user.nickname || user.username}
                    description={user.username}
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
