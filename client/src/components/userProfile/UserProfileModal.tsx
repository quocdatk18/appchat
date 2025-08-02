import { updateUser } from '@/lib/store/reducer/user/userSlice';
import { Gender } from '@/types';
import { CameraOutlined, PhoneOutlined, MessageOutlined } from '@ant-design/icons';
import { Avatar, Button, Form, Input, Modal, Select, Upload, message } from 'antd';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { Modal as AntdModal } from 'antd';
import { LoadingButton, useLoading } from '@/components/common';
import {
  createConversation,
  setSelectedConversation,
  setSelectedUser,
} from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { setSelectedUser as setUserSelected } from '@/lib/store/reducer/user/userSlice';

export type UserProfile = {
  _id: string;
  username: string;
  avatar: string;
  online: boolean;
  gender?: Gender;
  email?: string;
  nickname?: string;
};

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: UserProfile | null;
  isCurrentUser: boolean;
  mode?: 'profile' | 'change-password';
}

export default function UserProfileModal({
  open,
  onClose,
  user,
  isCurrentUser,
  onSuccess,
  mode = 'profile',
}: UserProfileModalProps) {
  const [form] = Form.useForm();
  const [changePasswordForm] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const { loading: uploading, withLoading: withUpload } = useLoading();
  const reduxUser = useSelector((state: RootState) => state.userReducer.user);
  const displayUser = isCurrentUser ? reduxUser : user;
  const conversations = useSelector((state: RootState) => state.conversationReducer.conversations);
  const selectedUser = useSelector((state: RootState) => state.conversationReducer.selectedUser);

  useEffect(() => {
    if (open && displayUser && mode === 'profile') {
      form.setFieldsValue({ avatar: displayUser.avatar || '' });
    }
  }, [open, displayUser?.avatar, mode]);
  // Upload avatar function
  const uploadAvatar = withUpload(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/upload?type=avatar`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await res.json();
    const url = data.url;

    if (typeof url === 'string') {
      await dispatch<any>(updateUser({ avatar: url }));
      message.success('Đổi ảnh đại diện thành công!');
      return { url };
    } else {
      throw new Error('Upload trả về link không hợp lệ!');
    }
  });

  const handleAvatarChange = async (info: any) => {
    if (info.file.status === 'uploading') {
      // Upload status được handle bởi withUpload
    }
    if (info.file.status === 'done') {
      const url = info.file.response?.url;
      if (typeof url === 'string') {
        // Avatar đã được update bởi uploadAvatar function
      } else {
        message.error('Upload trả về link không hợp lệ!');
      }
    }
    if (info.file.status === 'error') {
      message.error('Upload ảnh thất bại, hãy chọn lại ảnh khác hoặc thử lại sau!');
    }
  };

  // Custom upload handler
  const customRequest = async ({ file, onSuccess, onError }: any) => {
    try {
      const data = await uploadAvatar(file as File);
      onSuccess(data, file);
    } catch (err) {
      onError(err);
    }
  };

  // Xử lý cập nhật thông tin cá nhân (nickname, gender)
  const handleUpdateInfo = async () => {
    try {
      const values = form.getFieldsValue();
      const changed =
        values.nickname !== (displayUser?.nickname || displayUser?.username) ||
        values.gender !== displayUser?.gender;
      if (!changed) {
        message.info('Chưa có sự thay đổi nào!');
        return;
      }
      AntdModal.confirm({
        title: 'Xác nhận thay đổi',
        content: 'Bạn có chắc chắn muốn cập nhật thông tin này?',
        okText: 'Đồng ý',
        cancelText: 'Hủy',
        onOk: async () => {
          await dispatch<any>(updateUser({ nickname: values.nickname, gender: values.gender }));
          message.success('Cập nhật thông tin thành công!');
          if (onSuccess) onSuccess();
        },
      });
    } catch (err) {
      message.error('Cập nhật thông tin thất bại!');
    }
  };

  // Thêm form đổi mật khẩu
  const { withLoading: withChangePassword } = useLoading();
  const handleChangePassword = withChangePassword(async (values: any) => {
    try {
      // Gọi redux thunk đổi mật khẩu ở đây
      const result = await dispatch(
        // @ts-ignore
        require('@/lib/store/reducer/user/userSlice').changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        })
      );
      if (result.meta.requestStatus === 'fulfilled') {
        message.success('Đổi mật khẩu thành công!');
        changePasswordForm.resetFields();
        onClose();
      } else {
        message.error(result.payload || 'Đổi mật khẩu thất bại!');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra, vui lòng thử lại!');
    }
  });

  // Hàm xử lý nút nhắn tin
  const handleMessageUser = async () => {
    if (!displayUser || !reduxUser) return;

    try {
      // Tìm conversation hiện có
      const existingConversation = conversations.find(
        (conv) =>
          !conv.isGroup &&
          (conv.receiver?._id === displayUser._id ||
            conv.receiver?._id === displayUser._id.toString())
      );

      if (existingConversation) {
        // Nếu đã có conversation, chọn nó
        dispatch(setSelectedConversation(existingConversation));
      } else {
        // Tạo conversation mới bằng cách set selectedUser
        dispatch(
          setSelectedUser({
            ...displayUser,
            online: false, // Default value
          })
        );
        // Cũng set trong userSlice để đảm bảo
        dispatch(
          setUserSelected({
            ...displayUser,
            online: false,
          })
        );
        // Clear selectedConversation để hiển thị chat với user mới
        dispatch(setSelectedConversation(null));
      }

      // Đóng modal profile ngay lập tức
      onClose();

      // Đợi một chút rồi đóng modal group info và hiển thị thông báo
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        message.success('Đã mở cuộc trò chuyện!');
      }, 100);
    } catch (error) {
      console.error('handleMessageUser error', error);
      message.error('Không thể tạo cuộc trò chuyện!');
    }
  };

  if (mode === 'change-password') {
    return (
      <Modal open={open} onCancel={onClose} title="Đổi mật khẩu" footer={null} centered width={400}>
        <Form form={changePasswordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu hiện tại" size="large" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" size="large" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block>
              Đổi mật khẩu
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    );
  }
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Thông tin tài khoản"
      footer={null}
      centered
      width={400}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}
      >
        <Upload
          name="file"
          showUploadList={false}
          customRequest={customRequest}
          disabled={!isCurrentUser}
          accept="image/*"
          onChange={handleAvatarChange}
          data={{ type: 'avatar' }}
        >
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              cursor: isCurrentUser ? 'pointer' : 'default',
            }}
          >
            <Avatar
              key={displayUser?.avatar}
              size={80}
              src={
                displayUser?.avatar ? `${displayUser.avatar}?v=${Date.now()}` : '/avtDefault.png'
              }
              style={{ marginBottom: 12 }}
            />
            {isCurrentUser && (
              <CameraOutlined
                style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  fontSize: 22,
                  background: '#fff',
                  borderRadius: '50%',
                  padding: 4,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  border: '1px solid #eee',
                }}
              />
            )}
          </div>
        </Upload>
        <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 16 }}>
          {displayUser?.nickname || displayUser?.username}
        </div>

        {/* Action buttons */}
        {!isCurrentUser && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <Button icon={<PhoneOutlined />} size="large" style={{ flex: 1, height: 40 }}>
              Gọi điện
            </Button>
            <Button
              type="primary"
              icon={<MessageOutlined />}
              size="large"
              style={{ flex: 1, height: 40 }}
              onClick={handleMessageUser}
            >
              Nhắn tin
            </Button>
          </div>
        )}
      </div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          nickname: displayUser?.nickname || displayUser?.username,
          gender: displayUser?.gender || '',
          email: displayUser?.email || '',
          avatar: displayUser?.avatar || '',
        }}
      >
        <Form.Item label="Tên hiển thị" name="nickname">
          <Input disabled={!isCurrentUser} />
        </Form.Item>
        <Form.Item label="Giới tính" name="gender">
          <Select disabled={!isCurrentUser}>
            <Select.Option value="male">Nam</Select.Option>
            <Select.Option value="female">Nữ</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="Email" name="email">
          <Input disabled />
        </Form.Item>
        {isCurrentUser && (
          <Form.Item style={{ textAlign: 'center', marginTop: 24 }}>
            <Button type="primary" block loading={uploading} onClick={handleUpdateInfo}>
              Cập nhật
            </Button>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
