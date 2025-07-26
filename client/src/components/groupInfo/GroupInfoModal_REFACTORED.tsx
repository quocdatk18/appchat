'use client';
import { AppDispatch, RootState } from '@/lib/store';
import {
  getGroupInfo,
  updateGroup,
  removeMembersFromGroup,
  hideGroupFromAllMembers,
} from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { UserType } from '@/types';
import {
  UserOutlined,
  CrownOutlined,
  CameraOutlined,
  UsergroupAddOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Modal, List, message, Upload, Input } from 'antd';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './GroupInfoModal.module.scss';
import AddMembersModal from '../addMembers/AddMembersModal';
import { LoadingOverlay, LoadingButton, useLoading } from '@/components/common';

interface GroupInfoModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
}

export default function GroupInfoModal({ visible, onClose, conversationId }: GroupInfoModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const currentUser = useSelector((state: RootState) => state.userReducer.user);
  const [groupMembers, setGroupMembers] = useState<UserType[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [removingMembers, setRemovingMembers] = useState<string[]>([]);

  // Sử dụng useLoading hooks
  const { loading, withLoading } = useLoading();
  const { loading: uploading, withLoading: withUpload } = useLoading();
  const { loading: deletingGroup, withLoading: withDeleteGroup } = useLoading();

  // Lấy thông tin thành viên từ API
  const fetchGroupInfo = withLoading(async () => {
    const result = await dispatch(getGroupInfo(conversationId));
    if (getGroupInfo.fulfilled.match(result)) {
      if (result.payload.members) {
        setGroupMembers(result.payload.members);
        setGroupInfo(result.payload);
      }
    } else if (getGroupInfo.rejected.match(result)) {
      message.error(result.payload || 'Không thể tải thông tin nhóm');
    }
  });

  useEffect(() => {
    if (visible && selectedConversation?.isGroup && conversationId) {
      fetchGroupInfo();
    }
  }, [visible, selectedConversation, conversationId, fetchGroupInfo]);

  // Tạm thời dùng member đầu tiên làm admin nếu createdBy undefined
  const isCreator =
    selectedConversation?.createdBy === currentUser?._id ||
    (selectedConversation?.members && selectedConversation.members[0] === currentUser?._id);

  const creator = groupMembers.find(
    (member) =>
      member._id === selectedConversation?.createdBy ||
      member._id === groupInfo?.createdBy ||
      member._id === selectedConversation?.members?.[0] // Fallback cho member đầu tiên
  );

  // Hàm xóa thành viên
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      setRemovingMembers((prev) => [...prev, memberId]);

      await dispatch(
        removeMembersFromGroup({
          conversationId,
          memberIds: [memberId],
        })
      ).unwrap();

      message.success(`Đã xóa ${memberName} khỏi nhóm`);

      // Refresh lại danh sách thành viên
      const result = await dispatch(getGroupInfo(conversationId));
      if (getGroupInfo.fulfilled.match(result)) {
        if (result.payload.members) {
          setGroupMembers(result.payload.members);
          setGroupInfo(result.payload);
        }
      }
    } catch (error: any) {
      message.error(error.message || 'Xóa thành viên thất bại');
    } finally {
      setRemovingMembers((prev) => prev.filter((id) => id !== memberId));
    }
  };

  // Hàm ẩn nhóm với tất cả thành viên
  const handleHideGroup = withDeleteGroup(async () => {
    Modal.confirm({
      title: 'Ẩn nhóm',
      content:
        'Bạn có chắc chắn muốn ẩn nhóm này? Nhóm sẽ bị ẩn với tất cả thành viên và không thể khôi phục.',
      okText: 'Ẩn nhóm',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        try {
          await dispatch(hideGroupFromAllMembers(conversationId)).unwrap();
          message.success('Đã ẩn nhóm với tất cả thành viên');
          onClose();
        } catch (error: any) {
          message.error(error.message || 'Ẩn nhóm thất bại');
        }
      },
    });
  });

  // Upload avatar function
  const uploadAvatar = withUpload(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:5000/upload?type=avatar', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      const url = data.url;

      await dispatch(updateGroup({ conversationId, avatar: url }));
      message.success('Đổi avatar nhóm thành công!');
      return data;
    } else {
      throw new Error('Upload failed');
    }
  });

  return (
    <Modal
      title="Thông tin nhóm"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={500}
      destroyOnHidden
    >
      <LoadingOverlay loading={loading} text="Đang tải thông tin...">
        <div className={styles.groupInfoModal}>
          {/* Thông tin nhóm */}
          <div className={styles.groupHeader}>
            <div className={styles.avatarSection}>
              {isCreator ? (
                <Upload
                  name="file"
                  customRequest={async ({ file, onSuccess, onError }) => {
                    try {
                      const data = await uploadAvatar(file as File);
                      onSuccess?.(data);
                    } catch (error) {
                      message.error('Đổi avatar thất bại!');
                      onError?.(error as Error);
                    }
                  }}
                  onChange={(info) => {
                    // Upload status được handle bởi withUpload
                  }}
                  showUploadList={false}
                  accept="image/*"
                >
                  <div
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      cursor: 'pointer',
                    }}
                  >
                    <Avatar
                      src={selectedConversation?.avatar || '/avtDefault.png'}
                      size={80}
                      icon={<UserOutlined />}
                    />
                    <CameraOutlined
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        background: '#fff',
                        borderRadius: '50%',
                        padding: 4,
                        fontSize: 16,
                        color: '#1890ff',
                      }}
                    />
                  </div>
                </Upload>
              ) : (
                <Avatar
                  src={selectedConversation?.avatar || '/avtDefault.png'}
                  size={80}
                  icon={<UserOutlined />}
                />
              )}
            </div>
            <div className={styles.groupInfo}>
              <h3>{selectedConversation?.name}</h3>
              <p>{groupMembers.length} thành viên</p>
              {creator && (
                <p>
                  <CrownOutlined style={{ marginRight: 4 }} />
                  Quản trị viên: {creator.nickname || creator.username}
                </p>
              )}
            </div>
          </div>

          {/* Actions cho admin */}
          {isCreator && (
            <div className={styles.adminActions}>
              <Button
                type="primary"
                icon={<UsergroupAddOutlined />}
                onClick={() => setShowAddMembersModal(true)}
                className={styles.addMembersBtn}
              >
                Thêm thành viên
              </Button>
            </div>
          )}

          {/* Danh sách thành viên */}
          <div className={styles.membersList}>
            <h4>Thành viên ({groupMembers.length})</h4>
            <List
              dataSource={groupMembers}
              renderItem={(member) => {
                const memberRole =
                  member._id === selectedConversation?.createdBy ||
                  member._id === groupInfo?.createdBy ||
                  member._id === selectedConversation?.members?.[0]
                    ? 'Quản trị viên'
                    : 'Thành viên';

                return (
                  <List.Item
                    key={member._id}
                    actions={
                      isCreator &&
                      member._id !== currentUser?._id &&
                      member._id !== selectedConversation?.createdBy &&
                      member._id !== groupInfo?.createdBy
                        ? [
                            <LoadingButton
                              key="remove"
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              loading={removingMembers.includes(member._id)}
                              onClick={() =>
                                handleRemoveMember(member._id, member.nickname || member.username)
                              }
                              className={styles.removeMemberBtn}
                            >
                              Xóa
                            </LoadingButton>,
                          ]
                        : undefined
                    }
                  >
                    <List.Item.Meta
                      avatar={<Avatar src={member.avatar} icon={<UserOutlined />} />}
                      title={member.nickname || member.username}
                      description={memberRole}
                    />
                  </List.Item>
                );
              }}
            />
          </div>

          {/* Nút ẩn nhóm cho admin */}
          {isCreator && (
            <div className={styles.deleteGroupSection}>
              <LoadingButton
                type="primary"
                danger
                icon={<DeleteOutlined />}
                loading={deletingGroup}
                onClick={handleHideGroup}
                className={styles.deleteGroupBtn}
              >
                Ẩn nhóm với tất cả thành viên
              </LoadingButton>
            </div>
          )}
        </div>
      </LoadingOverlay>

      {/* Modal thêm thành viên */}
      <AddMembersModal
        visible={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        conversationId={conversationId}
        onSuccess={() => {
          setShowAddMembersModal(false);
          fetchGroupInfo(); // Refresh danh sách
        }}
      />
    </Modal>
  );
}
