import axiosClient from '@/api/axiosClient';
import { AuthState, UserType } from '@/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { clearAllUserStatus } from '../userStatus/userStatusSlice';

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
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/user/${data.user._id}/online`,
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

export const getUserById = createAsyncThunk<UserType | null, string, { rejectValue: string }>(
  'user/getUserById',
  async (userId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axiosClient.get(`/user/${userId}`, {
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

// Đổi mật khẩu
export const changePassword = createAsyncThunk<
  any,
  { currentPassword: string; newPassword: string },
  { rejectValue: string }
>('user/changePassword', async (passwordData, { rejectWithValue }) => {
  try {
    const res = await axiosClient.post('/user/change-password', passwordData);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Change password failed');
  }
});

// Yêu cầu đổi email - gửi yêu cầu qua email support
export const requestChangeEmail = createAsyncThunk<
  any,
  { currentPassword: string; newEmail: string; reason: string },
  { rejectValue: string }
>('user/requestChangeEmail', async (emailData, { rejectWithValue }) => {
  try {
    const res = await axiosClient.post('/user/request-change-email', emailData);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Request change email failed');
  }
});

// Quên mật khẩu - sinh mật khẩu mới và gửi về email
export const forgotPassword = createAsyncThunk<any, { email: string }, { rejectValue: string }>(
  'user/forgotPassword',
  async (emailData, { rejectWithValue }) => {
    try {
      const res = await axiosClient.post('/user/forgot-password', emailData);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Forgot password failed');
    }
  }
);

export const sendSupportRequest = createAsyncThunk<
  any,
  { subject: string; message: string; userEmail: string; username: string },
  { rejectValue: string }
>('user/sendSupportRequest', async (supportData, { rejectWithValue }) => {
  try {
    const res = await axiosClient.post('/user/support-request', supportData);
    return res.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Gửi yêu cầu hỗ trợ thất bại');
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

      // Disconnect socket khi logout
      if (typeof window !== 'undefined') {
        const socket = require('@/api/socket').default;
        socket.disconnect();
      }
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
      // Set initialized = true sau khi load từ storage
      state.initialized = true;
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
    // Login
    builder
      .addCase(handleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isOnline = true;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(handleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(handleRegister.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleRegister.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(handleRegister.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Check Auth
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.initialized = true;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.initialized = true;
      });

    // Update User
    builder.addCase(updateUser.fulfilled, (state, action) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    });

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Request Change Email
    builder
      .addCase(requestChangeEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestChangeEmail.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(requestChangeEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Forgot Password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Send Support Request
    builder
      .addCase(sendSupportRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendSupportRequest.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(sendSupportRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Get User By ID
    builder.addCase(getUserById.fulfilled, (state, action) => {
      state.selectedUser = action.payload;
    });
    builder.addCase(getUserById.rejected, (state, action) => {
      state.error = action.payload as string;
    });
  },
});

export const { loginSuccess, logout, loadUserFromStorage, setUser, setSelectedUser } =
  authSlice.actions;
const userReducer = authSlice.reducer;
export default userReducer;
