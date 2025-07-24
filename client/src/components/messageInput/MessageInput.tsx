'use client';

import {
  FileAddOutlined,
  LikeOutlined,
  PictureOutlined,
  SendOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import styles from './MessageInput.module.scss';
import { Button, Form, Input, Upload } from 'antd';
import { AppDispatch, RootState } from '@/lib/store';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import socket from '@/api/socket';

import {
  addConversation,
  setSelectedConversation,
  createConversation,
  setSelectedUser,
} from '@/lib/store/reducer/conversationSlice/conversationSlice';

export default function MessageInput() {
  const [input, setInput] = useState('');
  const dispatch = useDispatch<AppDispatch>();

  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const currentUser = useSelector((state: RootState) => state.userReducer.user);
  const selectedUser = useSelector((state: RootState) => state.conversationReducer.selectedUser);

  const sendMessageToConversation = (
    conversationId: string,
    receiverId: string,
    content: string
  ) => {
    if (!currentUser) return;

    socket.emit('send_message', {
      fromUserId: currentUser._id,
      receiverId: receiverId,
      conversationId,
      content,
    });
    // rely vào socket emit cho server
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !currentUser) return;

    if (!selectedConversation && selectedUser) {
      try {
        const resultAction = await dispatch(
          createConversation({
            receiverId: selectedUser._id,
            content,
            type: 'text',
            mediaUrl: '',
          })
        );
        const newConversation = resultAction.payload as any;
        if (newConversation && newConversation._id) {
          dispatch(setSelectedConversation(newConversation));
          dispatch(setSelectedUser(null));
          sendMessageToConversation(newConversation._id, selectedUser._id, content);
        }
        setInput('');
        return;
      } catch (err) {
        setInput('');
        return;
      }
    }

    if (!selectedConversation) return;
    let receiverId;
    if (selectedConversation.receiver?._id) {
      receiverId = selectedConversation.receiver._id;
    } else if (selectedConversation.members) {
      receiverId = selectedConversation.members.find((id) => id !== currentUser._id);
    }
    if (!receiverId) return;

    sendMessageToConversation(selectedConversation._id, receiverId, content);
    setInput('');
  };

  return (
    <div className="chat-input">
      <div className={styles.chatForm}>
        {/* Phần actions nằm trên */}
        <div className={styles.actions}>
          <Upload beforeUpload={() => false} showUploadList={false}>
            <Button type="text" icon={<PictureOutlined />} />
          </Upload>
          <Upload beforeUpload={() => false} showUploadList={false}>
            <Button type="text" icon={<FileAddOutlined />} />
          </Upload>
          <Button type="text" icon={<SmileOutlined />} />
        </div>

        {/* Input nằm dưới, full width */}
        <Form className={styles.chatInputForm} onFinish={handleSend}>
          <div className={styles.inputGroup}>
            <Form.Item className={styles.inputWrapper}>
              <Input
                placeholder="Nhập tin nhắn..."
                variant="underlined"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className={styles.input}
              />
            </Form.Item>
            <Button
              type="text"
              className={styles.sendButton}
              onClick={() => {
                if (input.trim()) {
                  handleSend();
                } else {
                  // xử lý like hoặc làm gì đó nếu cần
                }
              }}
              icon={input.trim() ? <SendOutlined /> : <LikeOutlined />}
              disabled={!currentUser} // optional
            />
          </div>
        </Form>
      </div>
    </div>
  );
}
