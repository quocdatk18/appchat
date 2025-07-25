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
    const res = await axiosClient.get(`/messages/conversation/${conversationId}`);

    return { conversationId, messages: res.data };
  } catch (error: any) {
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
      });

      return response.data as Message;
    } catch (error: any) {
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
      state.messages.push(action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
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

      .addCase(deleteMessageForUser.fulfilled, (state, action) => {
        // Ẩn message khỏi state (ẩn với user)
        state.messages = state.messages.filter((m) => m._id !== action.payload);
      })
      .addCase(recallMessage.fulfilled, (state, action) => {
        // Đánh dấu message đã thu hồi (ẩn cả 2 phía)
        state.messages = state.messages.map((m) =>
          m._id === action.payload ? { ...m, recalled: true } : m
        );
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
export const { addMessage, setMessages, setLoading, setError } = messageSlice.actions;
const messageReducer = messageSlice.reducer;
export default messageReducer;
