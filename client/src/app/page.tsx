'use client';

import socket from '@/api/socket';
import OnboardingSlider from '@/components/carousel/OnboardingSlider';
import ChatHeader from '@/components/header/ChatHeader';
import MessageInput from '@/components/messageInput/MessageInput';
import MessageList from '@/components/messageList/MessageList';
import Sidebar from '@/components/slidebar/Sidebar';
import UserProfileModal from '@/components/userProfile/UserProfileModal';
import { checkAuth, loadUserFromStorage } from '@/lib/store/reducer/user/userSlice';
import {
  updateUnreadCount,
  addConversation,
  fetchConversations,
} from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../lib/store/index';
import styles from './ChatLayout.module.scss';
import './globals.css';
import { UserType, Gender } from '@/types';

export default function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isAuthenticated, loading, user, initialized } = useSelector(
    (state: RootState) => state.userReducer
  );

  const selectedUser = useSelector((state: RootState) => state.userReducer.selectedUser);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );

  const [currentOpenConversationId, setCurrentOpenConversationId] = useState<string | null>(null);
  useEffect(() => {
    dispatch(loadUserFromStorage());
    dispatch(checkAuth());
  }, [dispatch]);

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.push('/login');
    }

    if (initialized && isAuthenticated && user) {
      socket.emit('user_connected', user._id);
      socket.connect();

      // Cleanup listeners chỉ khi component unmount hoặc user thay đổi
      return () => {
        socket.off('receive_message');
        socket.off('unread_count_updated');
      };
    }
  }, [initialized, isAuthenticated, user, router, dispatch]);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<UserType | null>(null);
  const currentUser = user;

  // Cập nhật currentOpenConversationId khi selectedConversation thay đổi
  useEffect(() => {
    setCurrentOpenConversationId(selectedConversation?._id || null);
  }, [selectedConversation?._id]);

  // Debug effect để theo dõi thay đổi state
  useEffect(() => {
    console.log('State changed:', {
      selectedConversation: selectedConversation?._id,
      selectedUser: selectedUser?._id,
    });
  }, [selectedConversation, selectedUser]);

  // Listener riêng cho unreadCount (không bị cleanup)
  useEffect(() => {
    if (!user?._id) return;

    const handleUnreadCountUpdate = (data: any) => {
      if (data.userId === user._id) {
        // Chỉ cập nhật nếu không đang ở trong conversation đó
        if (data.conversationId !== currentOpenConversationId) {
          dispatch(
            updateUnreadCount({
              conversationId: data.conversationId,
              userId: data.userId,
              count: data.count,
              increment: data.increment || false,
            })
          );
        }
      }
    };

    socket.on('unread_count_updated', handleUnreadCountUpdate);

    // Listener cho conversation mới được tạo
    const handleNewConversation = (data: any) => {
      if (data.conversation && user?._id) {
        // Kiểm tra nếu user hiện tại là thành viên của conversation mới
        const isMember = data.conversation.members.some(
          (memberId: any) => memberId.toString() === user._id
        );

        if (isMember) {
          // Fetch conversation đầy đủ từ server
          dispatch(fetchConversations());
        }
      }
    };

    socket.on('new_conversation_created', handleNewConversation);

    return () => {
      socket.off('unread_count_updated', handleUnreadCountUpdate);
      socket.off('new_conversation_created', handleNewConversation);
    };
  }, [user?._id, currentOpenConversationId, dispatch]);

  const handleAvatarClick = (user: UserType) => {
    setProfileUser(user);
    setShowProfileModal(true);
  };

  // Debug logs
  console.log('Page render state:', {
    selectedConversation: selectedConversation?._id,
    selectedUser: selectedUser?._id,
    showSlider: !selectedConversation && !selectedUser,
  });

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <Sidebar onAvatarClick={handleAvatarClick} />
      </div>
      <div className={styles.chatPanel}>
        {!selectedConversation && !selectedUser ? (
          <div className={styles.sliderWrapper}>
            <OnboardingSlider />
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <ChatHeader onAvatarClick={handleAvatarClick} />
            </div>
            <div className={styles.content}>
              <MessageList onAvatarClick={handleAvatarClick} />
            </div>
            <div className={styles.input}>
              <MessageInput />
            </div>
          </>
        )}
        {profileUser && (
          <UserProfileModal
            open={showProfileModal}
            onClose={() => {
              setShowProfileModal(false);
              setProfileUser(null);
            }}
            onSuccess={() => {
              setShowProfileModal(false);
              setProfileUser(null);
            }}
            user={{
              ...profileUser,
              gender: profileUser.gender as Gender | undefined,
            }}
            isCurrentUser={profileUser._id === currentUser?._id}
          />
        )}
      </div>
    </div>
  );
}
