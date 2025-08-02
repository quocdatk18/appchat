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
import { Button, Form, Input, Upload, Modal, message, Spin } from 'antd';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './MessageInput.module.scss';

import {
  createConversation,
  setSelectedConversation,
  updateUnreadCount,
  fetchConversations,
} from '@/lib/store/reducer/conversationSlice/conversationSlice';
import { addMessage } from '@/lib/store/reducer/message/MessageSlice';
import { setSelectedUser as setUserSelected } from '@/lib/store/reducer/user/userSlice';
import dayjs from 'dayjs';

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

// Định nghĩa hàm formatDate nếu chưa có
function formatDate(dateString: string) {
  return dayjs(dateString).format('HH:mm DD/MM/YYYY');
}

export default function MessageInput() {
  const [input, setInput] = useState('');
  const [pastedImages, setPastedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const dispatch = useDispatch<AppDispatch>();

  const selectedConversation = useSelector(
    (state: RootState) => state.conversationReducer.selectedConversation
  );
  const currentUser = useSelector((state: RootState) => state.userReducer.user);
  const selectedUser = useSelector((state: RootState) => state.userReducer.selectedUser);

  // Xác định placeholder text
  const getPlaceholderText = () => {
    if (selectedConversation) {
      if (selectedConversation.isGroup) {
        return `Nhập tin nhắn cho nhóm ${selectedConversation.name || ''}...`;
      } else {
        const receiver = selectedConversation.receiver;
        const receiverName = receiver?.nickname || receiver?.username || '';
        return `Nhập tin nhắn cho ${receiverName}...`;
      }
    } else if (selectedUser) {
      const userName = selectedUser.nickname || selectedUser.username || '';
      return `Nhập tin nhắn cho ${userName}...`;
    }
    return 'Chọn một cuộc trò chuyện để bắt đầu nhắn tin...';
  };

  const sendMessageToConversation = (
    conversationId: string,
    receiverId: string,
    content: string
  ) => {
    if (!currentUser) return;
    // Emit qua socket
    socket.emit('send_message', {
      fromUserId: currentUser._id,
      receiverId: receiverId,
      conversationId,
      content,
    });
  };

  // Hàm chung để upload file và gửi message
  const uploadAndSendFile = async (
    file: File,
    type: 'image' | 'video' | 'file',
    caption?: string
  ) => {
    if (!currentUser) return false;

    // Thêm file vào danh sách đang upload
    const fileId = `${file.name}-${Date.now()}`;
    setUploadingFiles((prev) => new Set([...prev, fileId]));

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
              content: caption || '',
              type: type,
              mediaUrl: fileUrl,
            })
          );
          const newConversation = resultAction.payload as any;
          if (newConversation && newConversation._id) {
            dispatch(setSelectedConversation(newConversation));
            dispatch(setUserSelected(null));
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
          content: caption || '',
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
          content: caption || '',
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
    } finally {
      // Xóa file khỏi danh sách đang upload
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
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
    const content = input.trim();
    const hasImages = pastedImages.length > 0;
    const hasText = content.length > 0;

    // Nếu không có gì để gửi
    if (!hasImages && !hasText) {
      return;
    }

    // Gửi từng ảnh một nếu có
    for (let i = 0; i < pastedImages.length; i++) {
      const file = pastedImages[i];
      // Gửi ảnh với caption (text) nếu có
      await uploadAndSendFile(file, 'image', hasText ? content : undefined);
    }

    // Clear preview sau khi gửi ảnh
    if (hasImages) {
      setPastedImages([]);
      setPreviewUrls([]);
    }

    // Gửi text riêng chỉ khi không có ảnh
    if (hasText && !hasImages && currentUser) {
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
            dispatch(fetchConversations());
          }
          setInput('');
          return;
        } catch (err) {
          console.error('Lỗi tạo conversation:', err);
          setInput('');
          return;
        }
      }

      if (!selectedConversation) {
        return;
      }

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
    }

    // Clear input sau khi gửi xong
    setInput('');
  };

  return (
    <div className={styles.chatInput}>
      {/* Hiển thị thông báo đang upload */}
      {uploadingFiles.size > 0 && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            marginBottom: '8px',
            fontSize: '12px',
            color: '#1890ff',
          }}
        >
          <Spin size="small" style={{ marginRight: '8px' }} />
          Đang tải lên {uploadingFiles.size} tệp...
        </div>
      )}
      <div className={styles.chatForm}>
        {/* Phần actions nằm trên */}
        <div className={styles.actions}>
          <Upload beforeUpload={handleImageUpload} showUploadList={false} accept="image/*" multiple>
            <Button
              disabled={!!selectedConversation?.deactivatedAt}
              type="text"
              icon={<PictureOutlined />}
            />
          </Upload>
          <Upload
            beforeUpload={handleFileUpload}
            showUploadList={false}
            accept="*"
            multiple={false}
          >
            <Button
              disabled={!!selectedConversation?.deactivatedAt}
              type="text"
              icon={<FileAddOutlined />}
            />
          </Upload>
        </div>

        {/* Input nằm dưới, full width */}
        <Form className={styles.chatInputForm} onFinish={handleSend}>
          <div className={styles.inputGroup}>
            <Form.Item className={styles.inputWrapper}>
              <Input.TextArea
                placeholder={
                  selectedConversation?.deactivatedAt
                    ? `Nhóm đã giải tán từ ${formatDate(selectedConversation.deactivatedAt)}`
                    : `Nhập tin nhắn cho nhóm ${selectedConversation?.name || ''}...`
                }
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
                disabled={!!selectedConversation?.deactivatedAt}
              />
              {/* Hiển thị preview nhiều ảnh bên dưới ô input, mỗi ảnh có nút xoá riêng */}
              {previewUrls.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className={styles.previewWrapper}>
                      <div style={{ position: 'relative' }}>
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
                            opacity: uploadingFiles.size > 0 ? 0.6 : 1,
                          }}
                        />
                        {uploadingFiles.size > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              background: 'rgba(0,0,0,0.7)',
                              borderRadius: '50%',
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Spin size="small" />
                          </div>
                        )}
                      </div>
                      <button
                        className={styles.deleteIcon}
                        onClick={() => handleRemoveImage(idx)}
                        type="button"
                        disabled={uploadingFiles.size > 0}
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
              icon={
                uploadingFiles.size > 0 ? (
                  <Spin size="small" />
                ) : input.trim() || pastedImages.length > 0 ? (
                  <SendOutlined />
                ) : (
                  <LikeOutlined />
                )
              }
              disabled={
                !currentUser || uploadingFiles.size > 0 || !!selectedConversation?.deactivatedAt
              }
            />
          </div>
        </Form>
      </div>
    </div>
  );
}
