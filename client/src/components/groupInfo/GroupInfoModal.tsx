'use client';
import { LoadingButton, LoadingOverlay, useLoading } from '@/components/common';
import { AppDispatch, RootState } from '@/lib/store';
import {
  getGroupInfo,
  hideGroupFromAllMembers,
  removeMembersFromGroup,
  updateGroup,
  createConversation,
  setSelectedConversation,
} from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { UserType } from '@/types';
import {
  CameraOutlined,
  CrownOutlined,
  DeleteOutlined,
  UsergroupAddOutlined,
  UserOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { Avatar, Button, List, message, Modal, Upload } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AddMembersModal from '../addMembers/AddMembersModal';
import styles from './GroupInfoModal.module.scss';

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
  const [isLoadingGroupInfo, setIsLoadingGroupInfo] = useState(false);

  const { loading: uploading, withLoading: withUpload } = useLoading();
  const { loading: deletingGroup, withLoading: withDeleteGroup } = useLoading();

  const fetchGroupInfo = useCallback(async () => {
    setIsLoadingGroupInfo(true);
    try {
      const result = await dispatch(getGroupInfo(conversationId));
      if (getGroupInfo.fulfilled.match(result)) {
        if (result.payload.members) {
          setGroupMembers(result.payload.members);
          setGroupInfo(result.payload);
        }
      } else if (getGroupInfo.rejected.match(result)) {
        message.error(result.payload || 'Không thể tải thông tin nhóm');
      }
    } finally {
      setIsLoadingGroupInfo(false);
    }
  }, [dispatch, conversationId]);

  useEffect(() => {
    if (visible && selectedConversation?.isGroup && conversationId) {
      fetchGroupInfo();
    }
  }, [visible, selectedConversation, conversationId, fetchGroupInfo]);

  const isCreator =
    selectedConversation?.createdBy === currentUser?._id ||
    (selectedConversation?.members && selectedConversation.members[0] === currentUser?._id);

  const creator = groupMembers.find(
    (member) =>
      member._id === selectedConversation?.createdBy ||
      member._id === groupInfo?.createdBy ||
      member._id === selectedConversation?.members?.[0]
  );

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

  const handleHideGroup = withDeleteGroup(async () => {
    Modal.confirm({
      title: 'Xoá nhóm',
      content:
        'Bạn có chắc chắn muốn xoá nhóm này? Nhóm sẽ bị xoá và bạn có thể gửi yêu cầu khôi phục trong 30 ngày.',
      okText: 'Xoá nhóm',
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

  const uploadAvatar = withUpload(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/upload?type=avatar`,
      {
        method: 'POST',
        body: formData,
      }
    );

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

  const userStatuses = useSelector((state: RootState) => state.userStatusReducer.statuses);
  const conversations = useSelector((state: RootState) => state.conversationReducer.conversations);

  // Hàm mở conversation với user
  const handleMessageUser = (user: UserType) => {
    // Tìm conversation hiện có
    const existingConversation = conversations.find(
      (conv) => !conv.isGroup && conv.receiver?._id === user._id
    );

    if (existingConversation) {
      // Nếu đã có conversation, chọn nó
      dispatch(setSelectedConversation(existingConversation));
    } else {
      // Chỉ set selectedUser, không tạo conversation ngay
      // Conversation sẽ được tạo khi user thực sự gửi tin nhắn
      dispatch(setSelectedConversation(null));
    }

    // Đóng modal
    onClose();
  };

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
      centered
      styles={{
        body: {
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        },
      }}
    >
      <LoadingOverlay loading={isLoadingGroupInfo} text="Đang tải thông tin...">
        <div className={styles.groupInfoModal}>
          {/* Header */}
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

          {/* Actions */}
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
          <div className={styles.membersListWrapper}>
            <h4>Thành viên ({groupMembers.length})</h4>
            <List
              className={styles.scrollableList}
              dataSource={groupMembers}
              renderItem={(member) => {
                const memberRole =
                  member._id === selectedConversation?.createdBy ||
                  member._id === groupInfo?.createdBy ||
                  member._id === selectedConversation?.members?.[0]
                    ? 'Quản trị viên'
                    : 'Thành viên';
                const isOnline = userStatuses[member._id]?.isOnline;

                return (
                  <List.Item
                    key={member._id}
                    actions={[
                      // Icon nhắn tin cho tất cả thành viên (trừ chính mình)
                      member._id !== currentUser?._id && (
                        <Button
                          key="message"
                          type="text"
                          icon={<MessageOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageUser(member);
                          }}
                          title="Nhắn tin"
                        />
                      ),
                      // Icon xóa chỉ cho admin (trừ chính mình và admin)
                      isCreator &&
                        member._id !== currentUser?._id &&
                        member._id !== selectedConversation?.createdBy &&
                        member._id !== groupInfo?.createdBy && (
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
                          </LoadingButton>
                        ),
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <Avatar src={member.avatar} icon={<UserOutlined />} />
                          <span
                            className={`online-status ${isOnline ? 'online' : 'offline'} small`}
                            style={{
                              position: 'absolute',
                              bottom: '2px',
                              right: '2px',
                              zIndex: 2,
                            }}
                          />
                        </div>
                      }
                      title={member.nickname || member.username}
                      description={memberRole}
                    />
                  </List.Item>
                );
              }}
            />
          </div>

          {/* Nút xóa nhóm */}
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
                Xoá nhóm
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
        existingMemberIds={groupMembers.map((member) => member._id)}
      />
    </Modal>
  );
}
