'use client';

import socket from '@/api/socket';
import OnboardingSlider from '@/components/carousel/OnboardingSlider';
import ChatHeader from '@/components/header/ChatHeader';
import MessageInput from '@/components/messageInput/MessageInput';
import MessageList from '@/components/messageList/MessageList';
import Sidebar from '@/components/slidebar/Sidebar';
import UserProfileModal from '@/components/userProfile/UserProfileModal';
import { checkAuth, loadUserFromStorage } from '@/lib/store/reducer/user/userSlice';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../lib/store/index';
import styles from './ChatLayout.module.scss';
import './globals.css';
import { UserType } from '@/types';

export default function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isAuthenticated, loading, user, initialized } = useSelector(
    (state: RootState) => state.userReducer
  );

  const selectedUser = useSelector((state: RootState) => state.conversationReducer.selectedUser);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
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
    }
  }, [initialized, isAuthenticated, user, router]);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<UserType | null>(null);
  const currentUser = user;

  const handleAvatarClick = (user: UserType) => {
    setProfileUser(user);
    setShowProfileModal(true);
  };

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
            user={profileUser}
            isCurrentUser={profileUser._id === currentUser?._id}
          />
        )}
      </div>
    </div>
  );
}
