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
