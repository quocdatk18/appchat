// hooks/useSocketListener.ts
import socket from '@/api/socket';
import { AppDispatch, RootState } from '@/lib/store';
import { updateLastMessage } from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { addMessage } from '@/lib/store/reducer/message/MessageSlice';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Message } from '@/types';

export const useSocketListener = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.userReducer.user);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const messages = useSelector((state: RootState) => state.messageReducer.messages);

  // Ref để tránh duplicated tin nhắn
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const handleMessage = (data: Message) => {
      console.log('📨 New real-time message:', data);
      const exists = messagesRef.current.some(
        (msg) =>
          msg._id === data._id ||
          (msg.senderId === data.senderId &&
            msg.content === data.content &&
            msg.createdAt === data.createdAt)
      );
      if (!exists) {
        dispatch(addMessage(data));
        dispatch(
          updateLastMessage({
            conversationId: data.conversationId,
            lastMessage: data.content,
          })
        );
      }
    };

    socket.on('receive_message', handleMessage);

    return () => {
      socket.off('receive_message', handleMessage);
    };
  }, [dispatch, selectedConversation, user]);
};

export function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return (...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
