'use client';

import socket from '@/api/socket';
import { AppDispatch, RootState } from '@/lib/store';
import {
  DeleteOutlined,
  FileAddOutlined,
  LikeOutlined,
  PictureOutlined,
  SendOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Upload, Modal, message } from 'antd';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './MessageInput.module.scss';

import {
  createConversation,
  setSelectedConversation,
  setSelectedUser,
  updateUnreadCount,
} from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { addMessage } from '@/lib/store/reducer/message/MessageSlice';

const allowedExts = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'mp4',
  'webm',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'zip',
  'txt',
];
function isAllowedFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext !== undefined && allowedExts.includes(ext);
}

export default function MessageInput() {
  const [input, setInput] = useState('');
  const [pastedImages, setPastedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
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

    // TẠM THỜI TẮT tin nhắn tạm để tránh duplicate
    // Tin nhắn sẽ được hiển thị khi nhận từ server

    // Emit qua socket
    socket.emit('send_message', {
      fromUserId: currentUser._id,
      receiverId: receiverId,
      conversationId,
      content,
    });
  };

  // Hàm chung để upload file và gửi message
  const uploadAndSendFile = async (file: File, type: 'image' | 'video' | 'file') => {
    if (!currentUser) return false;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'message');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      const fileUrl = data.url; // Sửa lại dòng này
      const mimetype = data.mimetype; // lấy mimetype thực tế
      const originalName = file.name; // lấy tên file gốc

      // Nếu không có selectedConversation nhưng có selectedUser, tạo conversation mới
      if (!selectedConversation && selectedUser) {
        try {
          const resultAction = await dispatch(
            createConversation({
              receiverId: selectedUser._id,
              content: '',
              type: type,
              mediaUrl: fileUrl,
            })
          );
          const newConversation = resultAction.payload as any;
          if (newConversation && newConversation._id) {
            dispatch(setSelectedConversation(newConversation));
            dispatch(setSelectedUser(null));
            // Không cần gửi lại vì message đã được tạo trong createConversation
          }
          return true;
        } catch (err) {
          console.error('Lỗi tạo conversation:', err);
          return false;
        }
      }

      // Nếu không có selectedConversation và selectedUser, không thể gửi
      if (!selectedConversation) return false;

      // Xử lý cho cả 1-1 và nhóm chat
      if (selectedConversation.isGroup && selectedConversation.members) {
        // Nhóm chat: gửi file đến tất cả thành viên
        socket.emit('send_message', {
          fromUserId: currentUser?._id,
          receiverId: '', // Để trống cho nhóm chat
          conversationId: selectedConversation._id,
          content: '',
          type: type,
          mediaUrl: fileUrl,
          mimetype: mimetype,
          originalName: originalName,
        });
      } else {
        // 1-1 chat: logic cũ
        let receiverId;
        if (selectedConversation.receiver?._id) {
          receiverId = selectedConversation.receiver._id;
        } else if (selectedConversation.members) {
          receiverId = selectedConversation.members.find((id) => id !== currentUser?._id);
        }

        if (!receiverId) return false;

        socket.emit('send_message', {
          fromUserId: currentUser?._id,
          receiverId: receiverId,
          conversationId: selectedConversation._id,
          content: '',
          type: type,
          mediaUrl: fileUrl,
          mimetype: mimetype,
          originalName: originalName,
        });
      }

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  };

  // Nút upload ảnh: chỉ gợi ý file ảnh, nếu chọn file khác thì hỏi xác nhận
  const handleImageUpload = async (file: File) => {
    if (!currentUser) return false;
    if (!isAllowedFile(file)) {
      message.error('Hiện tại chúng tôi chưa phát triển cho loại file này!');
      return false;
    }
    if (!file.type.startsWith('image/')) {
      Modal.confirm({
        title: 'Gửi dưới dạng ảnh?',
        content: 'Tệp bạn chọn không phải là ảnh. Bạn vẫn muốn gửi?',
        onOk: async () => {
          try {
            await uploadAndSendFile(file, 'image');
          } catch (err) {
            message.error('Hiện tại chúng tôi chưa phát triển cho loại file này!');
          }
        },
      });
      return false;
    }

    // Upload ảnh như bình thường
    try {
      await uploadAndSendFile(file, 'image');
    } catch (err) {
      message.error('Hiện tại chúng tôi chưa phát triển cho loại file này!');
    }
    return false;
  };

  // Nút upload file: gợi ý tất cả file, nếu là ảnh thì hỏi xác nhận
  const handleFileUpload = async (file: File) => {
    if (!currentUser) return false;
    if (!isAllowedFile(file)) {
      message.error('Hiện tại chúng tôi chưa phát triển cho loại file này!');
      return false;
    }
    if (file.type.startsWith('image/')) {
      Modal.confirm({
        title: 'Gửi ảnh dưới dạng tệp?',
        content: 'Bạn đang gửi ảnh dưới dạng tệp. Tiếp tục gửi?',
        onOk: async () => {
          try {
            await uploadAndSendFile(file, 'file');
          } catch (err) {
            message.error('Hiện tại chúng tôi chưa phát triển cho loại file này!');
          }
        },
      });
      return false;
    }

    // Nếu là video hoặc file khác, upload và gửi luôn
    const isVideo = file.type.startsWith('video/');
    try {
      await uploadAndSendFile(file, isVideo ? 'video' : 'file');
    } catch (err) {
      message.error('File không được hỗ trợ!');
    }
    return false;
  };

  // Xử lý paste nhiều ảnh từ clipboard
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length) {
      setPastedImages((prev) => [...prev, ...files]);
      setPreviewUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    }
  };

  // Xoá ảnh khỏi preview
  const handleRemoveImage = (idx: number) => {
    setPastedImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // Xử lý gửi tin nhắn (ảnh + text)
  const handleSend = async () => {
    // Gửi từng ảnh một nếu có
    for (let i = 0; i < pastedImages.length; i++) {
      const file = pastedImages[i];
      await uploadAndSendFile(file, 'image');
    }

    // Clear preview sau khi gửi
    if (pastedImages.length > 0) {
      setPastedImages([]);
      setPreviewUrls([]);
      setInput('');
      return;
    }

    // Nếu chỉ có text
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
          // Không cần gửi lại vì message đã được tạo trong createConversation
        }
        setInput('');
        return;
      } catch (err) {
        console.error('Lỗi tạo conversation:', err);
        setInput('');
        return;
      }
    }

    if (!selectedConversation) return;

    // Xử lý cho cả 1-1 và nhóm chat
    if (selectedConversation.isGroup && selectedConversation.members) {
      // Nhóm chat: gửi tin nhắn đến tất cả thành viên
      // Không cần receiverId cụ thể, chỉ cần conversationId
      socket.emit('send_message', {
        fromUserId: currentUser._id,
        receiverId: '', // Để trống cho nhóm chat
        conversationId: selectedConversation._id,
        content,
      });
    } else {
      // 1-1 chat: logic cũ
      let receiverId;
      if (selectedConversation.receiver?._id) {
        receiverId = selectedConversation.receiver._id;
      } else if (selectedConversation.members) {
        receiverId = selectedConversation.members.find((id) => id !== currentUser?._id);
      }

      if (!receiverId) return;
      sendMessageToConversation(selectedConversation._id, receiverId, content);
    }
    setInput('');
  };

  return (
    <div className={styles.chatInput}>
      <div className={styles.chatForm}>
        {/* Phần actions nằm trên */}
        <div className={styles.actions}>
          <Upload beforeUpload={handleImageUpload} showUploadList={false} accept="image/*" multiple>
            <Button type="text" icon={<PictureOutlined />} />
          </Upload>
          <Upload
            beforeUpload={handleFileUpload}
            showUploadList={false}
            accept="*"
            multiple={false}
          >
            <Button type="text" icon={<FileAddOutlined />} />
          </Upload>
        </div>

        {/* Input nằm dưới, full width */}
        <Form className={styles.chatInputForm} onFinish={handleSend}>
          <div className={styles.inputGroup}>
            <Form.Item className={styles.inputWrapper}>
              <Input.TextArea
                placeholder="Nhập tin nhắn..."
                variant="underlined"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className={styles.input}
              />
              {/* Hiển thị preview nhiều ảnh bên dưới ô input, mỗi ảnh có nút xoá riêng */}
              {previewUrls.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className={styles.previewWrapper}>
                      <img
                        src={url}
                        alt=""
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 8,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          background: '#f5f5f5',
                        }}
                      />
                      <button
                        className={styles.deleteIcon}
                        onClick={() => handleRemoveImage(idx)}
                        type="button"
                      >
                        <DeleteOutlined />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Form.Item>
            <Button
              type="text"
              className={styles.sendButton}
              onClick={() => {
                if (input.trim() || pastedImages.length > 0) {
                  handleSend();
                } else {
                  // xử lý like hoặc làm gì đó nếu cần
                }
              }}
              icon={input.trim() || pastedImages.length > 0 ? <SendOutlined /> : <LikeOutlined />}
              disabled={!currentUser}
            />
          </div>
        </Form>
      </div>
    </div>
  );
}
