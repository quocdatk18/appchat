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
        lastMessageType: item.lastMessageType,
        lastMessageSenderId: item.lastMessageSenderId,
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
  {
    receiverId: string | string[];
    content?: string;
    type: string;
    mediaUrl: string;
    isGroup?: boolean;
    groupName?: string;
  }, // Tham số truyền vào
  { rejectValue: string }
>(
  'conversation/createConversation',
  async (
    { receiverId, content, type, mediaUrl, isGroup = false, groupName = '' },
    { rejectWithValue }
  ) => {
    try {
      const res = await axiosClient.post('/conversations', {
        receiverId,
        content: content || '',
        type,
        mediaUrl,
        isGroup,
        groupName,
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

// --- Thêm thành viên vào nhóm ---
export const addMembersToGroup = createAsyncThunk<
  any,
  { conversationId: string; memberIds: string[] },
  { rejectValue: string }
>('conversation/addMembersToGroup', async ({ conversationId, memberIds }, { rejectWithValue }) => {
  try {
    const res = await axiosClient.patch(`/conversations/${conversationId}/add-members`, {
      memberIds,
    });
    return res.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Thêm thành viên thất bại');
  }
});

// --- Cập nhật thông tin nhóm ---
export const updateGroup = createAsyncThunk<
  any,
  { conversationId: string; name?: string; avatar?: string },
  { rejectValue: string }
>('conversation/updateGroup', async ({ conversationId, name, avatar }, { rejectWithValue }) => {
  try {
    const res = await axiosClient.patch(`/conversations/${conversationId}/update`, {
      name,
      avatar,
    });
    return res.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Cập nhật thông tin thất bại');
  }
});

// --- Xóa thành viên khỏi nhóm ---
export const removeMembersFromGroup = createAsyncThunk<
  any,
  { conversationId: string; memberIds: string[] },
  { rejectValue: string }
>(
  'conversation/removeMembersFromGroup',
  async ({ conversationId, memberIds }, { rejectWithValue }) => {
    try {
      const res = await axiosClient.patch(`/conversations/${conversationId}/remove-members`, {
        memberIds,
      });
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Xóa thành viên thất bại');
    }
  }
);

// --- Lấy thông tin chi tiết nhóm ---
export const getGroupInfo = createAsyncThunk<
  any,
  string, // conversationId
  { rejectValue: string }
>('conversation/getGroupInfo', async (conversationId, { rejectWithValue }) => {
  try {
    const res = await axiosClient.get(`/conversations/${conversationId}/group-info`);
    return res.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Không thể tải thông tin nhóm');
  }
});

// --- Ẩn nhóm với tất cả thành viên (chỉ admin) ---
export const hideGroupFromAllMembers = createAsyncThunk<
  any,
  string, // conversationId
  { rejectValue: string }
>('conversation/hideGroupFromAllMembers', async (conversationId, { rejectWithValue }) => {
  try {
    const res = await axiosClient.patch(`/conversations/${conversationId}/hide-group`);
    return res.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Ẩn nhóm thất bại');
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
      action: PayloadAction<{
        conversationId: string;
        lastMessage: string;
        lastMessageType?: string;
        lastMessageSenderId?: string;
      }>
    ) {
      const conversationIndex = state.conversations.findIndex(
        (c) => c._id === action.payload.conversationId
      );
      if (conversationIndex !== -1) {
        const conversation = state.conversations[conversationIndex];
        conversation.lastMessage = action.payload.lastMessage;
        conversation.lastMessageType = action.payload.lastMessageType;
        conversation.lastMessageSenderId = action.payload.lastMessageSenderId;
        conversation.updatedAt = new Date().toISOString();

        // Đưa conversation lên đầu (tin nhắn mới nhất)
        if (conversationIndex > 0) {
          const updatedConversation = state.conversations.splice(conversationIndex, 1)[0];
          state.conversations.unshift(updatedConversation);
        }
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
        // Nếu là nhóm chat, không set selectedUser
        if (action.payload.isGroup) {
          state.selectedUser = null;
        }
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
      })
      .addCase(addMembersToGroup.fulfilled, (state, action) => {
        // Cập nhật conversation trong state
        const conversationIndex = state.conversations.findIndex(
          (c) => c._id === action.payload._id
        );
        if (conversationIndex !== -1) {
          state.conversations[conversationIndex] = action.payload;
          // Cập nhật selectedConversation nếu đang chọn
          if (state.selectedConversation && state.selectedConversation._id === action.payload._id) {
            state.selectedConversation = action.payload;
          }
        }
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        // Cập nhật thông tin nhóm trong conversation
        const conversationIndex = state.conversations.findIndex(
          (c) => c._id === action.payload._id
        );
        if (conversationIndex !== -1) {
          const conversation = state.conversations[conversationIndex];
          if (action.payload.name) conversation.name = action.payload.name;
          if (action.payload.avatar) conversation.avatar = action.payload.avatar;

          // Cập nhật selectedConversation nếu đang chọn
          if (state.selectedConversation && state.selectedConversation._id === action.payload._id) {
            if (action.payload.name) state.selectedConversation.name = action.payload.name;
            if (action.payload.avatar) state.selectedConversation.avatar = action.payload.avatar;
          }
        }
      })
      .addCase(removeMembersFromGroup.fulfilled, (state, action) => {
        // Cập nhật conversation sau khi xóa thành viên
        const conversationIndex = state.conversations.findIndex(
          (c) => c._id === action.payload._id
        );
        if (conversationIndex !== -1) {
          state.conversations[conversationIndex] = action.payload;
          // Cập nhật selectedConversation nếu đang chọn
          if (state.selectedConversation && state.selectedConversation._id === action.payload._id) {
            state.selectedConversation = action.payload;
          }
        }
      })
      .addCase(getGroupInfo.pending, (state) => {
        // Có thể thêm loading state nếu cần
      })
      .addCase(getGroupInfo.fulfilled, (state, action) => {
        // Lưu thông tin nhóm vào state nếu cần
        // Hiện tại chỉ trả về data, không cần lưu vào state
      })
      .addCase(getGroupInfo.rejected, (state, action) => {
        // Xử lý lỗi nếu cần
      })
      .addCase(hideGroupFromAllMembers.fulfilled, (state, action) => {
        // Ẩn conversation khỏi state khi admin ẩn nhóm
        state.conversations = state.conversations.filter((c) => c._id !== action.meta.arg);
        state.selectedConversation = null;
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
