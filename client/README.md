src/
├── app/
│ ├── layout.tsx
│ ├── page.tsx # Landing page hoặc redirect đến /rooms
│ ├── login/ # Trang đăng nhập
│ │ └── page.tsx
│ ├── register/ # Trang đăng ký
│ │ └── page.tsx
│ ├── rooms/ # Root phòng chat
│ │ ├── page.tsx # Có thể redirect hoặc hiện danh sách nhóm
│ │ └── [roomId]/ # Trang chat theo phòng
│ │ └── page.tsx # Gọi ChatWindow + Sidebar
│ └── api/
│ ├── auth/ # Xử lý login, register
│ │ ├── login/route.ts
│ │ └── register/route.ts
│ ├── rooms/ # API lấy danh sách phòng
│ │ └── route.ts
│ ├── messages/ # API lấy & gửi tin nhắn
│ │ └── [roomId]/route.ts
│ ├── users/ # API lấy danh sách người dùng
│ │ └── route.ts
│ └── groups/ # Tạo/xóa/sửa nhóm chat
│ ├── route.ts
│ └── [groupId]/route.ts
│
├── components/ # Component UI dùng lại nhiều nơi
│ ├── Sidebar.tsx
│ ├── ChatWindow.tsx
│ ├── MessageItem.tsx
│ ├── GroupSettingsModal.tsx
│ └── ...
│
├── hooks/ # Custom hooks
│ ├── useUserMap.ts
│ ├── useSocket.ts
│ ├── useChatScroll.ts
│ └── ...
│
├── lib/ # Hàm tiện ích hoặc logic tái sử dụng
│ ├── auth.ts # Xác thực token, cookies, session
│ ├── fetcher.ts # Hàm fetch wrapper
│ └── utils.ts
│
├── services/ # Giao tiếp với API server (backend NestJS)
│ ├── messageService.ts
│ ├── roomService.ts
│ ├── userService.ts
│ └── groupService.ts
│
├── types/ # TypeScript types & interfaces
│ ├── user.ts
│ ├── room.ts
│ ├── message.ts
│ ├── group.ts
│ └── index.ts
│
├── styles/ # CSS thường hoặc SCSS
│ └── globals.css
│
└── constants/ # Các hằng số định nghĩa dùng chung
├── routes.ts
└── config.ts

/////

# Loading Components

Bộ component tối ưu cho loading state trong ứng dụng.

## Components

### 1. LoadingOverlay

Component overlay loading với spinner và text.

```tsx
import { LoadingOverlay } from '@/components/common';

<LoadingOverlay loading={loading} text="Đang xử lý...">
  <YourComponent />
</LoadingOverlay>;
```

**Props:**

- `loading`: boolean - Trạng thái loading
- `text`: string - Text hiển thị (optional)
- `size`: 'small' | 'default' | 'large' - Kích thước spinner
- `overlay`: boolean - Có overlay hay không (default: true)

### 2. LoadingButton

Button với loading state tích hợp.

```tsx
import { LoadingButton } from '@/components/common';

<LoadingButton loading={loading} loadingText="Đang xử lý..." onClick={handleClick}>
  Submit
</LoadingButton>;
```

**Props:**

- `loading`: boolean - Trạng thái loading
- `loadingText`: string - Text khi loading
- Tất cả props của Ant Design Button

### 3. withLoading HOC

Higher Order Component để wrap component với loading.

```tsx
import { withLoading } from '@/components/common';

const MyComponent = ({ disabled }) => <div>My Component</div>;

const LoadingMyComponent = withLoading(MyComponent);

// Sử dụng
<LoadingMyComponent loading={loading} loadingText="Đang tải..." />;
```

### 4. useLoading Hook

Custom hook để quản lý loading state.

```tsx
import { useLoading } from '@/components/common';

const MyComponent = () => {
  const { loading, setLoading, withLoading, startLoading, stopLoading } = useLoading();

  const handleAsyncAction = withLoading(async () => {
    await someAsyncOperation();
  });

  return (
    <div>
      <button onClick={startLoading}>Start</button>
      <button onClick={stopLoading}>Stop</button>
      <button onClick={handleAsyncAction}>Async Action</button>
    </div>
  );
};
```

## Tối ưu hóa

### Trước khi tối ưu:

```tsx
// Mỗi component có loading riêng
const [loading, setLoading] = useState(false);
const [uploading, setUploading] = useState(false);
const [searching, setSearching] = useState(false);

// Lặp lại code loading
<Button loading={loading}>Submit</Button>;
{
  loading && <Spin />;
}
```

### Sau khi tối ưu:

```tsx
// Sử dụng hook chung
const { loading, withLoading } = useLoading();
const { loading: uploading, withLoading: withUpload } = useLoading();

// Sử dụng component tái sử dụng
<LoadingButton loading={loading}>Submit</LoadingButton>
<LoadingOverlay loading={uploading}>
  <UploadComponent />
</LoadingOverlay>
```

## Lợi ích

1. **Giảm code trùng lặp**: Không cần viết loading logic nhiều lần
2. **Consistent UX**: Loading state đồng nhất trong app
3. **Dễ maintain**: Thay đổi loading style ở một chỗ
4. **Type safety**: TypeScript support đầy đủ
5. **Flexible**: Có thể customize cho từng use case

## Migration Guide

### Từ useState loading:

```tsx
// Cũ
const [loading, setLoading] = useState(false);
const handleSubmit = async () => {
  setLoading(true);
  try {
    await submitData();
  } finally {
    setLoading(false);
  }
};

// Mới
const { loading, withLoading } = useLoading();
const handleSubmit = withLoading(async () => {
  await submitData();
});
```

### Từ Button loading:

```tsx
// Cũ
<Button loading={loading} disabled={loading}>
  {loading ? 'Đang xử lý...' : 'Submit'}
</Button>

// Mới
<LoadingButton
  loading={loading}
  loadingText="Đang xử lý..."
>
  Submit
</LoadingButton>
```

//////////////

# Generic Types T và R trong Loading System

## T là gì?

**T** là **Type Parameters** - đại diện cho kiểu dữ liệu của parameters trong function.

### Ví dụ:

```typescript
// T = [string, number] - array của parameters
const handleSubmit = withLoading<[string, number], void>(async (name: string, age: number) => {
  console.log(name, age);
});

// T = [UserType] - array với 1 parameter
const updateUser = withLoading<[UserType], UserType>(async (user: UserType) => {
  return await api.updateUser(user);
});

// T = [] - array rỗng (không có parameters)
const refreshData = withLoading<[], void>(async () => {
  await fetchData();
});
```

## R là gì?

**R** là **Return Type** - đại diện cho kiểu dữ liệu trả về của function.

### Ví dụ:

```typescript
// R = string
const getUsername = withLoading<[string], string>(async (id: string) => {
  return await api.getUsername(id);
});

// R = UserType
const createUser = withLoading<[UserType], UserType>(async (user: UserType) => {
  return await api.createUser(user);
});

// R = void (không trả về gì)
const deleteUser = withLoading<[string], void>(async (id: string) => {
  await api.deleteUser(id);
});
```

## Cách hoạt động trong useLoading

```typescript
// Định nghĩa
const withLoading =
  <T extends any[], R>(asyncFn: (...args: T) => Promise<R>) =>
  async (...args: T): Promise<R> => {
    // Implementation
  };

// Sử dụng
const handleLogin = withLoading<[LoginData], LoginResponse>(
  async (loginData: LoginData): Promise<LoginResponse> => {
    return await api.login(loginData);
  }
);

// T = [LoginData] - 1 parameter kiểu LoginData
// R = LoginResponse - return type kiểu LoginResponse
```

## Ví dụ thực tế

```typescript
// 1. Function không có parameters, không return
const refreshPage = withLoading<[], void>(async () => {
  window.location.reload();
});

// 2. Function có 1 parameter, return string
const searchUser = withLoading<[string], UserType[]>(async (query: string): Promise<UserType[]> => {
  return await api.searchUsers(query);
});

// 3. Function có nhiều parameters, return object
const createGroup = withLoading<[string, string[], File?], GroupType>(
  async (name: string, members: string[], avatar?: File): Promise<GroupType> => {
    return await api.createGroup({ name, members, avatar });
  }
);
```

## Lợi ích của Generic Types

1. **Type Safety**: TypeScript kiểm tra kiểu dữ liệu chính xác
2. **IntelliSense**: IDE gợi ý parameters và return type
3. **Compile-time Errors**: Phát hiện lỗi khi compile
4. **Code Documentation**: Code tự document về kiểu dữ liệu

## Tóm tắt

- **T**: Array của parameter types `[type1, type2, ...]`
- **R**: Return type của function
- **extends any[]**: Đảm bảo T là array (parameters luôn là array)
- **Promise<R>**: Đảm bảo function trả về Promise
