import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '@/api/axiosClient';
import { Message, MessageState } from '@/types';

// ───────────────────────────────────────────────
// 🚀 Khởi tạo state ban đầu
const initialState: MessageState = {
  messages: [],
  loading: false,
  error: null,
};

// ───────────────────────────────────────────────
// 🔄 Fetch messages theo conversationId
export const fetchMessages = createAsyncThunk<
  { conversationId: string; messages: Message[] },
  string,
  { rejectValue: string }
>('messages/fetchMessages', async (conversationId, thunkAPI) => {
  try {
    const res = await axiosClient.get(`/messages/conversation/${conversationId}`, {
      timeout: 15000, // 15s timeout cho tin nhắn
    });

    return { conversationId, messages: res.data };
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      return thunkAPI.rejectWithValue('Kết nối mạng chậm, vui lòng thử lại');
    }
    if (!navigator.onLine) {
      return thunkAPI.rejectWithValue('Không có kết nối mạng');
    }
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Không thể tải tin nhắn');
  }
});

// ───────────────────────────────────────────────
// 📨 Gửi tin nhắn (API + trả về tin nhắn mới từ server)
export const sendMessage = createAsyncThunk<Message, Partial<Message>, { rejectValue: string }>(
  'message/sendMessage',
  async (newMessage, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axiosClient.post('/messages', newMessage, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 20000, // 20s timeout cho gửi tin nhắn
      });

      return response.data as Message;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        return rejectWithValue('Kết nối mạng chậm, tin nhắn sẽ được gửi khi mạng ổn định');
      }
      if (!navigator.onLine) {
        return rejectWithValue('Không có kết nối mạng, tin nhắn sẽ được gửi khi có mạng');
      }
      return rejectWithValue(error.response?.data?.message || 'Không gửi được tin nhắn');
    }
  }
);

// --- Xoá message phía 1 user (ẩn với họ, không xoá vật lý) ---
export const deleteMessageForUser = createAsyncThunk<
  string, // trả về id message đã xoá
  string, // id message
  { rejectValue: string }
>('messages/deleteMessageForUser', async (messageId, { rejectWithValue }) => {
  try {
    await axiosClient.patch(`/messages/${messageId}/delete`);
    return messageId;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete message');
  }
});

// --- Thu hồi message (ẩn cả 2 phía, sẽ xoá vật lý sau N phút) ---
export const recallMessage = createAsyncThunk<
  string, // trả về id message đã thu hồi
  string, // id message
  { rejectValue: string }
>('messages/recallMessage', async (messageId, { rejectWithValue }) => {
  try {
    await axiosClient.patch(`/messages/${messageId}/recall`);
    return messageId;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to recall message');
  }
});

// --- Đánh dấu message đã đọc (thêm userId vào seenBy) ---
export const markMessageSeen = createAsyncThunk<
  { messageId: string; userId: string },
  { messageId: string; userId: string },
  { rejectValue: string }
>('messages/markMessageSeen', async ({ messageId, userId }, { rejectWithValue }) => {
  try {
    await axiosClient.patch(`/messages/${messageId}/seen`);
    return { messageId, userId };
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to mark message as seen');
  }
});

// ───────────────────────────────────────────────
// 🧩 Slice Redux
const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setMessages(state, action: PayloadAction<Message[]>) {
      state.messages = action.payload;
    },
    addMessage(state, action: PayloadAction<Message>) {
      // Kiểm tra xem có tin nhắn tạm không để thay thế
      const tempMessageIndex = state.messages.findIndex(
        (msg) =>
          msg._id.startsWith('temp_') &&
          msg.content === action.payload.content &&
          msg.senderId === action.payload.senderId
      );

      if (tempMessageIndex !== -1) {
        // Thay thế tin nhắn tạm bằng tin nhắn thật từ server
        state.messages[tempMessageIndex] = action.payload;
      } else {
        // Kiểm tra xem tin nhắn đã tồn tại chưa (tránh duplicate)
        const existingMessageIndex = state.messages.findIndex(
          (msg) => msg._id === action.payload._id
        );

        if (existingMessageIndex === -1) {
          // Thêm tin nhắn mới
          state.messages.push(action.payload);
        }
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    // Cập nhật message sau khi xóa hoặc thu hồi
    updateMessage: (state, action: PayloadAction<Message>) => {
      const index = state.messages.findIndex((msg) => msg._id === action.payload._id);
      if (index !== -1) {
        state.messages[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Không thể tải tin nhắn';
      })

      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push(action.payload);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Không gửi được tin nhắn';
      })

      .addCase(deleteMessageForUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteMessageForUser.fulfilled, (state, action) => {
        state.loading = false;
        // Ẩn message khỏi state (ẩn với user)
        state.messages = state.messages.filter((m) => m._id !== action.payload);
      })
      .addCase(deleteMessageForUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete message';
      })

      .addCase(recallMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(recallMessage.fulfilled, (state, action) => {
        state.loading = false;
        // Đánh dấu message đã thu hồi (ẩn cả 2 phía)
        const index = state.messages.findIndex((m) => m._id === action.payload);
        if (index !== -1) {
          state.messages[index] = {
            ...state.messages[index],
            recalled: true,
            content: '[Tin nhắn đã được thu hồi]',
          };
        }
      })
      .addCase(recallMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to recall message';
      })

      .addCase(markMessageSeen.fulfilled, (state, action) => {
        // Thêm userId vào seenBy của message
        state.messages = state.messages.map((m) =>
          m._id === action.payload.messageId
            ? { ...m, seenBy: [...(m.seenBy || []), action.payload.userId] }
            : m
        );
      });
  },
});

// ───────────────────────────────────────────────
// 📦 Export reducer và actions
export const { setMessages, addMessage, setLoading, setError, updateMessage } =
  messageSlice.actions;
const messageReducer = messageSlice.reducer;
export default messageReducer;
