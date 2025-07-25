// redux/conversationSlice.ts
import axiosClient from '@/api/axiosClient';
import { useDebounce } from '@/hooks/hookCustoms';
import { Conversation, ConversationState, UserType } from '@/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// ---- Initial State ----
const initialState: ConversationState = {
  conversations: [],
  searchResults: [],
  selectedConversation: null,
  selectedUser: null, // thêm dòng này
  loading: false,
  error: null,
};

// --- Lấy tất cả hội thoại của user ---
export const fetchConversations = createAsyncThunk<Conversation[], void, { rejectValue: string }>(
  'conversation/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axiosClient.get('/conversations', {
        headers: { authorization: `Bearer ${token}` },
      });
      // Map đúng dữ liệu trả về từ BE cho cả nhóm và 1-1
      const mappedConversations = res.data.map((item: any) => ({
        _id: item._id,
        isGroup: item.isGroup,
        name: item.name,
        avatar: item.avatar,
        receiver: item.isGroup ? undefined : item.receiver, // chỉ cho 1-1
        members: item.members,
        memberPreviews: item.memberPreviews, // cho nhóm
        lastMessage: item.lastMessage,
        updatedAt: item.updatedAt,
        deletedBy: item.deletedBy, // userId đã xoá conversation này (ẩn với họ)
      }));
      return mappedConversations;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversations');
    }
  }
);

// --- Tạo một cuộc trò chuyện mới ---
export const createConversation = createAsyncThunk<
  Conversation, // Trả về một Conversation
  { receiverId: string; content?: string; type: string; mediaUrl: string }, // Tham số truyền vào
  { rejectValue: string }
>(
  'conversation/createConversation',
  async ({ receiverId, content, type, mediaUrl }, { rejectWithValue }) => {
    try {
      const res = await axiosClient.post('/conversations', {
        receiverId,
        content: content || '',
        type,
        mediaUrl,
      });

      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create conversation');
    }
  }
);
// --- Tìm kiếm hội thoại ---

export const searchConversation = createAsyncThunk(
  'conversation/searchConversation',
  async (query: string, thunkAPI) => {
    try {
      const res = await axiosClient.get(`/conversations/search?q=${query}`);
      return res.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Lỗi tìm kiếm');
    }
  }
);

// --- Xoá conversation phía 1 user (ẩn với họ, không xoá vật lý) ---
export const deleteConversationForUser = createAsyncThunk<
  string, // trả về id conversation đã xoá
  string, // id conversation
  { rejectValue: string }
>('conversation/deleteConversationForUser', async (conversationId, { rejectWithValue }) => {
  try {
    await axiosClient.patch(`/conversations/${conversationId}/delete`);
    return conversationId;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete conversation');
  }
});

// ---- Slice ----
const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<Conversation[]>) {
      state.conversations = action.payload;
    },
    addConversation(state, action: PayloadAction<Conversation>) {
      state.conversations.unshift(action.payload);
    },
    setSelectedConversation(state, action: PayloadAction<Conversation | null>) {
      state.selectedConversation = action.payload;
    },
    setSelectedUser(state, action: PayloadAction<UserType | null>) {
      state.selectedUser = action.payload;
    },
    updateLastMessage(
      state,
      action: PayloadAction<{ conversationId: string; lastMessage: string }>
    ) {
      const conversation = state.conversations.find((c) => c._id === action.payload.conversationId);
      if (conversation) {
        conversation.lastMessage = action.payload.lastMessage;
        conversation.updatedAt = new Date().toISOString();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch conversations';
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        state.conversations.unshift(action.payload);
        state.selectedConversation = action.payload;
      })
      .addCase(searchConversation.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteConversationForUser.fulfilled, (state, action) => {
        // Xoá conversation khỏi state (ẩn với user)
        state.conversations = state.conversations.filter((c) => c._id !== action.payload);
        // Nếu đang chọn conversation này thì bỏ chọn
        if (state.selectedConversation && state.selectedConversation._id === action.payload) {
          state.selectedConversation = null;
        }
      });
  },
});

// ---- Exports ----
export const {
  setConversations,
  addConversation,
  setSelectedConversation,
  setSelectedUser,
  updateLastMessage,
} = conversationSlice.actions;

export default conversationSlice.reducer;
