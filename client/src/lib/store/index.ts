import { configureStore } from '@reduxjs/toolkit';
import userReducer from './reducer/user/userSlice';
import messageReducer from './reducer/message/MessageSlice';
import conversationReducer from './reducer/conversationSlice/conversationSlice';
import socketReducer from './reducer/socket/SocketSclice';
import userStatusReducer from './reducer/userStatus/userStatusSlice';

export const store = configureStore({
  reducer: { userReducer, messageReducer, conversationReducer, socketReducer, userStatusReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
