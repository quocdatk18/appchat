'use client';

import Sidebar from '@/components/slidebar/Sidebar';
import './globals.css';
import ChatHeader from '@/components/header/ChatHeader';
import MessageList from '@/components/messageList/MessageList';
import MessageInput from '@/components/messageInput/MessageInput';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../lib/store/index';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Carousel } from 'antd';
import styles from './ChatLayout.module.scss';
import socket from '@/api/socket';
import { checkAuth, loadUserFromStorage } from '@/lib/store/reducer/user/userSlice';
import OnboardingSlider from '@/components/carousel/OnboardingSlider';

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
  console.log('selectedConversation', selectedConversation);
  console.log('selectedUser', selectedUser);
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
      console.log('user connected', user._id);
      socket.connect();
    }
  }, [initialized, isAuthenticated, user, router]);

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <Sidebar />
      </div>
      <div className={styles.chatPanel}>
        {!selectedConversation && !selectedUser ? (
          <div className={styles.sliderWrapper}>
            <OnboardingSlider />
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <ChatHeader />
            </div>
            <div className={styles.content}>
              <MessageList />
            </div>
            <div className={styles.input}>
              <MessageInput />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
