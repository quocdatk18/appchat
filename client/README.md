src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Landing page hoặc redirect đến /rooms
│   ├── login/                            # Trang đăng nhập
│   │   └── page.tsx
│   ├── register/                         # Trang đăng ký
│   │   └── page.tsx
│   ├── rooms/                            # Root phòng chat
│   │   ├── page.tsx                      # Có thể redirect hoặc hiện danh sách nhóm
│   │   └── [roomId]/                     # Trang chat theo phòng
│   │       └── page.tsx                  # Gọi ChatWindow + Sidebar
│   └── api/
│       ├── auth/                         # Xử lý login, register
│       │   ├── login/route.ts
│       │   └── register/route.ts
│       ├── rooms/                        # API lấy danh sách phòng
│       │   └── route.ts
│       ├── messages/                     # API lấy & gửi tin nhắn
│       │   └── [roomId]/route.ts
│       ├── users/                        # API lấy danh sách người dùng
│       │   └── route.ts
│       └── groups/                       # Tạo/xóa/sửa nhóm chat
│           ├── route.ts
│           └── [groupId]/route.ts
│
├── components/                           # Component UI dùng lại nhiều nơi
│   ├── Sidebar.tsx
│   ├── ChatWindow.tsx
│   ├── MessageItem.tsx
│   ├── GroupSettingsModal.tsx
│   └── ...
│
├── hooks/                                # Custom hooks
│   ├── useUserMap.ts
│   ├── useSocket.ts
│   ├── useChatScroll.ts
│   └── ...
│
├── lib/                                  # Hàm tiện ích hoặc logic tái sử dụng
│   ├── auth.ts                           # Xác thực token, cookies, session
│   ├── fetcher.ts                        # Hàm fetch wrapper
│   └── utils.ts
│
├── services/                             # Giao tiếp với API server (backend NestJS)
│   ├── messageService.ts
│   ├── roomService.ts
│   ├── userService.ts
│   └── groupService.ts
│
├── types/                                # TypeScript types & interfaces
│   ├── user.ts
│   ├── room.ts
│   ├── message.ts
│   ├── group.ts
│   └── index.ts
│
├── styles/                               # CSS thường hoặc SCSS
│   └── globals.css
│
└── constants/                            # Các hằng số định nghĩa dùng chung
    ├── routes.ts
    └── config.ts