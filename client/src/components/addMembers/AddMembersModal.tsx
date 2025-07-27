'use client';
import { addMembersToGroup } from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { AppDispatch } from '@/lib/store';
import { useDispatch } from 'react-redux';
import { message } from 'antd';
import dynamic from 'next/dynamic';

// Import dynamic để tránh lỗi SSR
const CreateGroupModal = dynamic(() => import('../createGroup/CreateGroupModal'), {
  ssr: false,
});

interface AddMembersModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  onSuccess?: () => void;
  existingMemberIds?: string[]; // Thêm prop để truyền danh sách thành viên hiện tại
}

export default function AddMembersModal({
  visible,
  onClose,
  conversationId,
  onSuccess,
  existingMemberIds = [],
}: AddMembersModalProps) {
  const dispatch = useDispatch<AppDispatch>();

  const handleCreateGroup = async (selectedUsers: string[]) => {
    try {
      await dispatch(
        addMembersToGroup({
          conversationId,
          memberIds: selectedUsers,
        })
      );

      message.success('Thêm thành viên thành công!');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      message.error('Thêm thành viên thất bại!');
    }
  };

  return (
    <CreateGroupModal
      visible={visible}
      onClose={onClose}
      mode="add-members"
      onSuccess={handleCreateGroup}
      existingMemberIds={existingMemberIds}
    />
  );
}
