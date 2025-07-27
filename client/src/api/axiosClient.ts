import axios from 'axios';

// ===== Khởi tạo axiosClient với baseURL động =====
const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 30000, // 30s timeout mặc định
});

// ===== Interceptor: Tự động gắn token vào header =====
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===== Interceptor: Xử lý lỗi response (nếu muốn) =====
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Có thể hiện message lỗi ở đây nếu muốn
    // if (error.response?.data?.message) {
    //   message.error(error.response.data.message);
    // }
    return Promise.reject(error);
  }
);

export default axiosClient;
