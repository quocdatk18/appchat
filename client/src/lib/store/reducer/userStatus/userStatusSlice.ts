// features/userStatus/userStatusSlice.ts

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '@/api/axiosClient';

interface UserStatusState {
  statuses: {
    [userId: string]: {
      isOnline: boolean;
      lastSeen: string | null;
    };
  };
  loading: boolean;
  error: string | null;
}

const initialState: UserStatusState = {
  statuses: {},
  loading: false,
  error: null,
};

export const fetchUserStatus = createAsyncThunk(
  'userStatus/fetchUserStatus',
  async (userId: string, thunkAPI) => {
    try {
      const res = await axiosClient.get(`/user/${userId}/status`);
      return { userId, ...res.data }; // { userId, isOnline, lastSeen }
    } catch (err: any) {
      return thunkAPI.rejectWithValue('Không thể lấy trạng thái');
    }
  }
);

const userStatusSlice = createSlice({
  name: 'userStatus',
  initialState,
  reducers: {
    setUserOnlineStatus: (state, action: PayloadAction<{ userId: string; isOnline: boolean }>) => {
      const { userId, isOnline } = action.payload;
      if (!state.statuses[userId]) {
        state.statuses[userId] = { isOnline, lastSeen: null };
      } else {
        state.statuses[userId].isOnline = isOnline;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserStatus.fulfilled, (state, action) => {
        state.loading = false;
        const { userId, isOnline, lastSeen } = action.payload;
        state.statuses[userId] = { isOnline, lastSeen };
      })
      .addCase(fetchUserStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setUserOnlineStatus } = userStatusSlice.actions;
const userStatusReducer = userStatusSlice.reducer;
export default userStatusReducer;
