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
      });
  },
});

// ───────────────────────────────────────────────
// 📦 Export reducer và actions
export const { addMessage, setMessages, setLoading, setError } = messageSlice.actions;
const messageReducer = messageSlice.reducer;
export default messageReducer;
