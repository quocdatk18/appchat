# Chat App

Ứng dụng chat realtime với Next.js, NestJS và Socket.IO.

## 🚀 Features

### Core Features

- ✅ **Real-time messaging** với Socket.IO
- ✅ **User authentication** với JWT
- ✅ **Group conversations** và private chats
- ✅ **File uploads** (images, videos, documents)
- ✅ **Online/offline status** indicator
- ✅ **Unread message count** với realtime updates
- ✅ **Message recall/delete** functionality
- ✅ **User profile management**

### Admin Features

- ✅ **Super Admin account** với role-based access
- ✅ **Conversation restoration** cho admin
- ✅ **User management** và support requests
- ✅ **Email notifications** cho password reset và email changes

### UI/UX Features

- ✅ **Responsive design** với Ant Design
- ✅ **Modern UI** với SCSS modules
- ✅ **Loading states** và error handling
- ✅ **Real-time updates** cho all features

## 📁 Project Structure

```
appChat/
├── client/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React Components
│   │   ├── lib/          # Redux Store & Utils
│   │   └── types/        # TypeScript Types
│   └── public/           # Static Assets
├── server/                # NestJS Backend
│   ├── src/
│   │   ├── auth/         # Authentication
│   │   ├── conversations/ # Chat Management
│   │   ├── message/      # Message Handling
│   │   ├── user/         # User Management
│   │   └── upload/       # File Upload
│   ├── scripts/          # Admin Scripts (gitignored)
│   └── uploads/          # Uploaded Files
└── .gitignore           # Git Ignore Rules
```

## 🛠️ Tech Stack

### Frontend

- **Next.js 15** - React Framework
- **Redux Toolkit** - State Management
- **Ant Design** - UI Components
- **Socket.IO Client** - Real-time Communication
- **SCSS Modules** - Styling

### Backend

- **NestJS** - Node.js Framework
- **MongoDB** - Database
- **Socket.IO** - Real-time Communication
- **JWT** - Authentication
- **Multer** - File Upload
- **Nodemailer** - Email Service

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local hoặc Atlas)
- npm hoặc yarn

### Installation

1. **Clone repository**

```bash
git clone <repository-url>
cd appChat
```

2. **Install dependencies**

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **Environment Setup**

```bash
# Server environment
cd server
cp .env.example .env
# Edit .env với MongoDB URI và email settings

# Client environment
cd ../client
# Tạo file .env với nội dung:
# NEXT_PUBLIC_API_URL=http://localhost:5000
# NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
# NODE_ENV=development
```

4. **Database Setup**

```bash
# Tạo admin account (optional)
cd server
npm run create-admin
```

5. **Start Development**

```bash
# Start server (port 5000)
cd server
npm run start:dev

# Start client (port 3000)
cd ../client
npm run dev
```

## 🔧 Admin Scripts

Các script quản lý admin được lưu trong `server/scripts/` và **không được commit lên Git**.

### Available Scripts

```bash
cd server

# Tạo admin account
npm run create-admin

# Xóa admin account
npm run delete-admin

# Liệt kê admin accounts
npm run list-admin
```

### Admin Credentials

- **Username**: superadmin ##account Admin app hổ trợ(chỉ 1 acc và không thể tạo trên UI)
- **Password**: admin123456
- **Email**: admin@chatapp.com

## 📝 tổng hợp các api cho FE

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Password reset

### Conversations

- `GET /conversations` - Get user conversations
- `POST /conversations` - Create conversation
- `PATCH /conversations/:id/read` - Mark as read

### Messages

- `GET /messages/:conversationId` - Get messages
- `POST /messages` - Send message
- `DELETE /messages/:id` - Delete message
- `PATCH /messages/:id/recall` - Recall message

### Users

- `GET /users/profile` - Get user profile
- `PATCH /users/profile` - Update profile
- `POST /users/change-password` - Change password
- `POST /users/request-change-email` - Request email change (gửi yêu cầu qua email support)

### Admin (Super Admin only)

- `POST /conversations/admin/restore` - Restore conversation
- `GET /conversations/admin/search` - Search conversations
- `POST /users/admin/change-email` - Change user email (chỉ Super Admin)

## 🔒 Security

- **JWT Authentication** cho tất cả protected routes
- **Role-based access** cho admin features
- **Input validation** với class-validator
- **File upload security** với Multer
- **CORS configuration** cho cross-origin requests

## 📧 Email Features

- **Password reset** emails - Gửi mật khẩu mới khi quên
- **Email change notifications** - Thông báo khi Super Admin đổi email
- **Support request confirmations** - Xác nhận yêu cầu hỗ trợ
- **Admin notifications** - Thông báo cho Super Admin về yêu cầu hổ trợ của user

## 🎨 UI Components

### Core Components

- `ChatLayout` - Main layout
- `ChatListSidebar` - Conversation list
- `MessageList` - Message display
- `MessageInput` - Message input
- `UserProfileModal` - User profile
- `GroupInfoModal` - Group information

### Modals & Forms

- `AuthForm` - Login/Register
- `CreateGroupModal` - Group creation
- `AddMembersModal` - Add members
- `SecuritySupportModal` - Security settings

## 🔄 Real-time Features

### Socket Events

- `join_conversation` - Join chat room
- `receive_message` - New message
- `message_recalled` - Message recalled
- `message_deleted` - Message deleted
- `unread_count_updated` - Unread count update
- `user_online` - User online status
- `user_offline` - User offline status

## 📱 Responsive Design

- **Mobile-first** approach
- **Flexible layouts** với CSS Grid/Flexbox # hiện tại chưa hoàn thành,sẽ bổ sung sau ở những lần commit kế tiếp
- **Touch-friendly** interactions
- **Progressive enhancement**

## 🚀 Deployment khi hoàn chỉ sẽ tiến hành

### Production Build

```bash
# Build client
cd client
npm run build

# Build server
cd ../server
npm run build
```

### Environment Variables

```bash
# Server (.env)
MONGODB_URI=mongodb://localhost:27017/chat-app // có thể thay bằng link sql khác nếu có(hiện tại mình dùng mongodb)
JWT_SECRET=your-jwt-secret
EMAIL_HOST=smtp.gmail.com          email gửi kết quả hổ trợ và mật khẩu khi user yêu cầu
EMAIL_USER=your-email@gmail.com    email của user
EMAIL_PASS=your-app-password       pass tuỳ thuộc vào loại maill bạn dùng,mình dùng gmail nên k cần

# Client (.env)
NEXT_PUBLIC_API_URL=http://localhost:5000    # URL của server API và Socket.IO (development)
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email admin@chatapp.com or create an issue in the repository.
