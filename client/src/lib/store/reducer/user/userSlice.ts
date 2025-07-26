import axiosClient from '@/api/axiosClient';
import { AuthState, UserType } from '@/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState: AuthState & { selectedUser?: UserType | null } = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isOnline: false,
  initialized: false,
  selectedUser: null,
};

export const handleLogin = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, thunkAPI) => {
    try {
      const { data } = await axiosClient.post('/auth/login', credentials);

      await axios.patch(
        `http://localhost:5000/user/${data.user._id}/online`,
        {
          isOnline: false,
        },
        {
          headers: {
            Authorization: `Bearer ${data.token}`, // dùng token vừa login xong
          },
        }
      );

      return data; // { token, user }
    } catch (error: any) {
      if (error.response) {
        return thunkAPI.rejectWithValue(error.response.data.message || 'Đăng nhập thất bại');
      } else {
        return thunkAPI.rejectWithValue('Mất kết nối đến server, vui lòng thử lại.');
      }
    }
  }
);

export const handleRegister = createAsyncThunk(
  'auth/register',
  async (credentials: { username: string; password: string }, thunkAPI) => {
    try {
      const { data } = await axiosClient.post('/auth/register', credentials);
      return data; // { token, user }
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response.data.message || 'register failed');
    }
  }
);

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, thunkAPI) => {
  try {
    const { data } = await axiosClient.get('/auth/me');
    // data là user object từ BE trả về
    return data;
  } catch (error: any) {
    // Nếu lỗi (token hết hạn, không hợp lệ)
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return thunkAPI.rejectWithValue('Token hết hạn hoặc không hợp lệ');
  }
});

export const searchUserByEmail = createAsyncThunk<UserType | null, string, { rejectValue: string }>(
  'user/searchUserByEmail',
  async (email, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axiosClient.get(`/user/searchByEmail?email=${email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data || null;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Không tìm thấy user');
    }
  }
);

export const searchUsers = createAsyncThunk<UserType[], string, { rejectValue: string }>(
  'user/searchUsers',
  async (query, { rejectWithValue }) => {
    try {
      const res = await axiosClient.get(`/user/search?q=${query}`);
      return res.data || [];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Không tìm thấy user');
    }
  }
);

export const handleUpload = createAsyncThunk(
  'user/handleUpload',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const res = await axiosClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Upload failed');
    }
  }
);

export const updateUser = createAsyncThunk<
  any, // trả về user mới nhất
  { nickname?: string; avatar?: string; gender?: string },
  { rejectValue: string }
>('user/updateUser', async (updateData, { rejectWithValue }) => {
  try {
    const res = await axiosClient.patch('/user/profile', updateData);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Update failed');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isOnline = true;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isOnline = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    loadUserFromStorage: (state) => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      if (token) {
        state.token = token;
        state.isAuthenticated = true;
      }
      if (user) {
        state.user = JSON.parse(user);
      }
    },
    setUser: (state, action: PayloadAction<AuthState['user']>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setSelectedUser: (state, action: PayloadAction<UserType | null>) => {
      state.selectedUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(handleLogin.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(handleLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user)); // Thêm dòng này
      })
      .addCase(handleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(handleRegister.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.initialized = true;
        state.isAuthenticated = true;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.user = null;
        state.isAuthenticated = false;
        state.token = null;
        state.error = action.payload as string;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .addCase(searchUserByEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchUserByEmail.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedUser = action.payload;
      })
      .addCase(searchUserByEmail.rejected, (state, action) => {
        state.loading = false;
        state.selectedUser = null;
        state.error = action.payload as string;
      })
      .addCase(searchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading = false;
        // Không cần lưu vào state vì chỉ dùng cho search tạm thời
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        if (state.user && action.payload) {
          state.user = { ...state.user, ...action.payload };
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      });
  },
});

export const { loginSuccess, logout, loadUserFromStorage, setUser, setSelectedUser } =
  authSlice.actions;
const userReducer = authSlice.reducer;
export default userReducer;
