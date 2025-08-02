import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '@/api/axiosClient';
import { Message, MessageState } from '@/types';

const initialState: MessageState = {
  messages: [],
  loading: false,
  error: null,
};

// ───────────────────────────────────────────────
// Fetch messages
export const fetchMessages = createAsyncThunk<
  { conversationId: string; messages: Message[] },
  string,
  { rejectValue: string }
>('messages/fetchMessages', async (conversationId, thunkAPI) => {
  try {
    const res = await axiosClient.get(`/messages/conversation/${conversationId}`, {
      timeout: 15000,
    });
    return { conversationId, messages: res.data };
  } catch (error: any) {
    if (error.code === 'ECONNABORTED')
      return thunkAPI.rejectWithValue('Kết nối mạng chậm, vui lòng thử lại');
    if (!navigator.onLine) return thunkAPI.rejectWithValue('Không có kết nối mạng');
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Không thể tải tin nhắn');
  }
});

// ───────────────────────────────────────────────
// Send message
export const sendMessage = createAsyncThunk<Message, Partial<Message>, { rejectValue: string }>(
  'messages/sendMessage',
  async (newMessage, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axiosClient.post('/messages', newMessage, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
      });
      return response.data as Message;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED')
        return rejectWithValue('Kết nối mạng chậm, tin nhắn sẽ được gửi khi mạng ổn định');
      if (!navigator.onLine)
        return rejectWithValue('Không có kết nối mạng, tin nhắn sẽ được gửi khi có mạng');
      return rejectWithValue(error.response?.data?.message || 'Không gửi được tin nhắn');
    }
  }
);

// ───────────────────────────────────────────────
// Delete message for one user
export const deleteMessageForUser = createAsyncThunk<string, string, { rejectValue: string }>(
  'messages/deleteMessageForUser',
  async (messageId, { rejectWithValue }) => {
    try {
      await axiosClient.patch(`/messages/${messageId}/delete`);
      return messageId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete message');
    }
  }
);

// Delete message for all users (admin only)
export const deleteMessageForAll = createAsyncThunk<string, string, { rejectValue: string }>(
  'messages/deleteMessageForAll',
  async (messageId, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/messages/${messageId}/delete-for-all`);
      return messageId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete message for all users'
      );
    }
  }
);

// Recall message
export const recallMessage = createAsyncThunk<
  { success: boolean; message: string; data?: any },
  string,
  { rejectValue: string }
>('messages/recallMessage', async (messageId, { rejectWithValue }) => {
  try {
    const response = await axiosClient.patch(`/messages/${messageId}/recall`);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to recall message');
  }
});

// Mark seen
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
// Slice
const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setMessages(state, action: PayloadAction<Message[]>) {
      state.messages = action.payload;
    },
    addMessage(state, action: PayloadAction<Message>) {
      const tempMessageIndex = state.messages.findIndex(
        (msg) =>
          msg._id.startsWith('temp_') &&
          msg.content === action.payload.content &&
          msg.senderId._id === action.payload.senderId._id
      );
      if (tempMessageIndex !== -1) {
        state.messages[tempMessageIndex] = action.payload;
      } else if (!state.messages.find((msg) => msg._id === action.payload._id)) {
        state.messages.push(action.payload);
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    updateMessage(state, action: PayloadAction<Partial<Message> & { _id: string }>) {
      const index = state.messages.findIndex((msg) => msg._id === action.payload._id);
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], ...action.payload };
      }
    },
    removeMessage(state, action: PayloadAction<string>) {
      state.messages = state.messages.filter((m) => m._id !== action.payload);
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
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push(action.payload);
      })
      .addCase(deleteMessageForUser.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = state.messages.filter((m) => m._id !== action.payload);
      })
      .addCase(deleteMessageForAll.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = state.messages.filter((m) => m._id !== action.payload);
      })
      .addCase(recallMessage.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.messages.findIndex((m) => m._id === action.payload.data._id);
        if (index !== -1) {
          state.messages[index] = {
            ...state.messages[index],
            recalled: true,
            recallAt: action.payload.data.recallAt,
          };
        }
      })
      .addCase(markMessageSeen.fulfilled, (state, action) => {
        state.messages = state.messages.map((m) =>
          m._id === action.payload.messageId
            ? { ...m, seenBy: [...(m.seenBy || []), action.payload.userId] }
            : m
        );
      });
  },
});

export const { setMessages, addMessage, setLoading, setError, updateMessage, removeMessage } =
  messageSlice.actions;
export default messageSlice.reducer;
