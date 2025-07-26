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

const userStatusSlice = createSlice({
  name: 'userStatus',
  initialState,
  reducers: {
    setUserOnlineStatus: (
      state,
      action: PayloadAction<{ userId: string; isOnline: boolean; lastSeen?: string }>
    ) => {
      const { userId, isOnline, lastSeen } = action.payload;
      if (!state.statuses[userId]) {
        state.statuses[userId] = { isOnline, lastSeen: lastSeen || null };
      } else {
        state.statuses[userId].isOnline = isOnline;
        if (lastSeen) {
          state.statuses[userId].lastSeen = lastSeen;
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Không cần extraReducers nữa vì chỉ dùng Socket
  },
});

export const { setUserOnlineStatus } = userStatusSlice.actions;
const userStatusReducer = userStatusSlice.reducer;
export default userStatusReducer;
