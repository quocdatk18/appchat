# Client Environment Setup

## 📁 Tạo file .env

Tạo file `.env` trong thư mục `client/` với nội dung:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000

# Socket.IO Configuration (optional - sẽ dùng NEXT_PUBLIC_API_URL nếu không set)
# NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Development Configuration
NODE_ENV=development
```

## 🔧 Environment Variables

### NEXT_PUBLIC_API_URL

- **Development**: `http://localhost:5000`
- **Production**: `https://your-domain.com`
- **Purpose**: URL của backend API server

### NEXT_PUBLIC_SOCKET_URL

- **Development**: `http://localhost:5000`
- **Production**: `https://your-domain.com`
- **Purpose**: URL cho Socket.IO connection
- **Optional**: Nếu không set, sẽ dùng NEXT_PUBLIC_API_URL

### NODE_ENV

- **Development**: `development`
- **Production**: `production`
- **Purpose**: Environment mode cho Next.js

## 🚀 Quick Setup

```bash
# Tạo file .env
cd client
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:5000" >> .env
echo "NODE_ENV=development" >> .env
```

## ⚠️ Lưu ý

- File `.env` đã được thêm vào `.gitignore`
- Không commit file `.env` lên Git
- Chỉ commit file `env.example` làm template
