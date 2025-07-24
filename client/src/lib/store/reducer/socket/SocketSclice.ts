import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SocketState {
  socketId: string | null;
}

const initialState: SocketState = {
  socketId: null,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setSocketId: (state, action: PayloadAction<string>) => {
      state.socketId = action.payload;
    },
  },
});

export const { setSocketId } = socketSlice.actions;
const socketReducer = socketSlice.reducer;
export default socketReducer;
