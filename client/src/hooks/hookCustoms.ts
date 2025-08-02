// hooks/useSocketListener.ts
import socket from '@/api/socket';
import { AppDispatch, RootState } from '@/lib/store';
import { updateLastMessage } from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { addMessage } from '@/lib/store/reducer/message/MessageSlice';
import { setUserOnlineStatus } from '@/lib/store/reducer/userStatus/userStatusSlice';
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Message } from '@/types';

/**
 * Hook để lắng nghe các sự kiện Socket.IO
 * - Xử lý tin nhắn realtime
 * - Xử lý thay đổi trạng thái online/offline của user
 * - Join vào các conversation để nhận tin nhắn
 */
export const useSocketListener = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.userReducer.user);
  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const messages = useSelector((state: RootState) => state.messageReducer.messages);
  const conversations = useSelector((state: RootState) => state.conversationReducer.conversations);

  // Load status của tất cả user trong conversations khi app khởi động
  useEffect(() => {
    if (user && conversations.length > 0) {
      // Lấy tất cả user IDs từ conversations
      const allUserIds = new Set<string>();
      conversations.forEach((conv) => {
        if (conv.members) {
          conv.members.forEach((memberId) => {
            if (memberId !== user._id) {
              allUserIds.add(memberId);
            }
          });
        }
      });

      // Emit status request cho từng user
      allUserIds.forEach((userId) => {
        socket.emit('request_user_status', userId);
      });
    }
  }, [user, conversations]);

  /**
   * Join vào tất cả conversations của user để nhận tin nhắn realtime
   * - Tự động join khi user login hoặc conversations thay đổi
   */
  useEffect(() => {
    if (user?._id && conversations.length > 0) {
      // Join tất cả conversations
      conversations.forEach((conv) => {
        socket.emit('join_conversation', { conversationId: conv._id, userId: user._id });
      });
    }
  }, [user, conversations]);

  /**
   * Ref để tránh duplicated tin nhắn
   * - Lưu trữ messages hiện tại để so sánh
   */
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * Lắng nghe các sự kiện Socket.IO
   * - receive_message: Xử lý tin nhắn mới
   * - user_status_changed: Xử lý thay đổi trạng thái online/offline
   */
  useEffect(() => {
    /**
     * Xử lý tin nhắn mới từ server
     * - Kiểm tra trùng lặp để tránh duplicate
     * - Thêm vào store nếu đang chọn conversation
     * - Cập nhật lastMessage trong sidebar
     * - Emit seen_message nếu user đang ở trong conversation này
     */
    const handleMessage = (data: Message) => {
      const exists = messagesRef.current.some(
        (msg) =>
          msg._id === data._id ||
          (msg.senderId === data.senderId &&
            msg.content === data.content &&
            msg.createdAt === data.createdAt)
      );

      if (!exists) {
        // Chỉ thêm message vào store nếu đang chọn conversation này
        if (selectedConversation?._id === data.conversationId) {
          dispatch(addMessage(data));
        }

        // Luôn cập nhật lastMessage trong sidebar
        dispatch(
          updateLastMessage({
            conversationId: data.conversationId,
            lastMessage: data.content,
            lastMessageType: data.type || 'text',
            lastMessageSenderId: data.senderId,
          })
        );
      }
    };

    /**
     * Xử lý thay đổi trạng thái online/offline của user
     * - Cập nhật Redux state để UI tự động refresh
     * - Lưu cả lastSeen để hiển thị thời gian offline
     */
    const handleUserStatusChange = (data: {
      userId: string;
      isOnline: boolean;
      lastSeen: string | Date;
    }) => {
      // Convert lastSeen to ISO string if it's a Date object
      const lastSeenString =
        data.lastSeen instanceof Date ? data.lastSeen.toISOString() : data.lastSeen;

      dispatch(
        setUserOnlineStatus({
          userId: data.userId,
          isOnline: data.isOnline,
          lastSeen: lastSeenString,
        })
      );
    };

    socket.on('receive_message', handleMessage);
    socket.on('user_status_changed', handleUserStatusChange);
    socket.on('user_status_response', handleUserStatusChange);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('user_status_changed', handleUserStatusChange);
      socket.off('user_status_response', handleUserStatusChange);
    };
  }, [dispatch, selectedConversation, user]);
};

/**
 * Hook để debounce function
 * - Tránh gọi function quá nhiều lần trong thời gian ngắn
 * - Thường dùng cho search input để tránh gọi API liên tục
 * @param callback - Function cần debounce
 * @param delay - Thời gian delay (ms)
 * @returns Function đã được debounce
 */
export function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  return debouncedCallback;
}
