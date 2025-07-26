# Logic Loading trong từng Component

## 1. MessageList.tsx - Loading Messages

### Logic:

```typescript
// Lấy loading state từ Redux
const { messages, loading, error } = useSelector((state: RootState) => state.messageReducer);

// Khi có conversation mới → fetch messages
useEffect(() => {
  if (conversation?._id && currentUser?._id) {
    dispatch(fetchMessages(conversation._id)); // → set loading = true
  }
}, [conversation, currentUser, dispatch]);

// Hiển thị loading spinner
if (loading) {
  return (
    <div className={styles.messageList}>
      <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
    </div>
  );
}
```

### Flow:

1. **User chọn conversation** → `fetchMessages()` được dispatch
2. **Redux set loading = true** → UI hiển thị spinner
3. **API trả về data** → Redux set loading = false
4. **UI render messages** → Không còn spinner

---

## 2. GroupInfoModal.tsx - Loading Group Info

### Logic:

```typescript
// Local loading state
const [loading, setLoading] = useState(false);
const [uploading, setUploading] = useState(false);
const [removingMembers, setRemovingMembers] = useState<string[]>([]);
const [deletingGroup, setDeletingGroup] = useState(false);

// Khi modal mở → fetch group info
useEffect(() => {
  if (visible && selectedConversation?.isGroup && conversationId) {
    setLoading(true);
    dispatch(getGroupInfo(conversationId))
      .then((result) => {
        // Handle success
      })
      .finally(() => {
        setLoading(false); // → Stop loading
      });
  }
}, [visible, selectedConversation, conversationId, dispatch]);

// Upload avatar
const handleAvatarChange = (info: any) => {
  if (info.file.status === 'uploading') {
    setUploading(true);
  }
  if (info.file.status === 'done') {
    setUploading(false);
  }
};

// Remove member
const handleRemoveMember = async (memberId: string) => {
  setRemovingMembers((prev) => [...prev, memberId]); // → Loading cho member này
  try {
    await dispatch(removeMembersFromGroup({...}));
  } finally {
    setRemovingMembers((prev) => prev.filter((id) => id !== memberId));
  }
};
```

### Flow:

1. **Modal mở** → `setLoading(true)` → Hiển thị "Đang tải thông tin..."
2. **API trả về** → `setLoading(false)` → Hiển thị group info
3. **Upload avatar** → `setUploading(true)` → Disable form
4. **Upload xong** → `setUploading(false)` → Enable form
5. **Remove member** → `setRemovingMembers([memberId])` → Loading button cho member đó

---

## 3. CreateGroupModal.tsx - Loading Create Group

### Logic:

```typescript
// Local loading states
const [loading, setLoading] = useState(false);
const [uploading, setUploading] = useState(false);

// Create group
const handleCreateGroup = async () => {
  setLoading(true); // → Disable form, show loading button
  try {
    await dispatch(createConversation({...}));
    message.success('Tạo nhóm thành công!');
    onClose();
  } catch (error) {
    message.error('Tạo nhóm thất bại!');
  } finally {
    setLoading(false); // → Enable form
  }
};

// Upload avatar
const handleAvatarChange = (info: any) => {
  if (info.file.status === 'uploading') {
    setUploading(true);
  }
  if (info.file.status === 'done') {
    setUploading(false);
  }
};
```

### Flow:

1. **User click "Tạo nhóm"** → `setLoading(true)` → Button hiển thị loading
2. **API call** → Disable form, prevent double submit
3. **API success** → `setLoading(false)` → Enable form, close modal
4. **Upload avatar** → `setUploading(true)` → Show upload progress

---

## 4. UserProfileModal.tsx - Loading Upload Avatar

### Logic:

```typescript
// Local loading state
const [uploading, setUploading] = useState(false);

// Upload avatar
const handleAvatarChange = async (info: any) => {
  if (info.file.status === 'uploading') {
    setUploading(true); // → Disable form
  }
  if (info.file.status === 'done') {
    setUploading(false); // → Enable form
    // Update user avatar via Redux
    await dispatch(updateUser({ avatar: url }));
  }
};
```

### Flow:

1. **User chọn file** → `setUploading(true)` → Disable form
2. **File upload** → Show upload progress
3. **Upload success** → `setUploading(false)` → Update avatar via Redux
4. **Update success** → Show success message

---

## 5. AuthForm.tsx - Loading Login/Register (Đã tối ưu)

### Logic:

```typescript
// Redux loading state
const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.userReducer);

// Navigation loading
const { loading: isNavigating, withLoading: withNavigation } = useLoading();

// Form submit
const onFinish = async (values: any) => {
  if (checkLogin) {
    const result = await dispatch(handleLogin(values)); // → Redux set loading = true
    if (handleLogin.fulfilled.match(result)) {
      // Success
    }
  }
};

// Navigation
<Link
  onClick={() => withNavigation(() => new Promise(resolve => setTimeout(resolve, 100)))()}
>
  {isNavigating ? 'Đang chuyển...' : 'Đăng ký'}
</Link>
```

### Flow:

1. **User submit form** → Redux `loading = true` → Disable form, show overlay
2. **API call** → Loading overlay với spinner
3. **API success** → Redux `loading = false` → Enable form, redirect
4. **Click navigation** → `isNavigating = true` → Disable link, show "Đang chuyển..."

---

## 6. Redux Message Slice - Loading Messages

### Logic:

```typescript
// Redux state
const initialState = {
  messages: [],
  loading: false,
  error: null,
};

// Actions
export const fetchMessages = createAsyncThunk(
  'message/fetchMessages',
  async (conversationId: string) => {
    const response = await api.getMessages(conversationId);
    return response.data;
  }
);

// Extra reducers
extraReducers: (builder) => {
  builder
    .addCase(fetchMessages.pending, (state) => {
      state.loading = true; // → UI hiển thị loading
    })
    .addCase(fetchMessages.fulfilled, (state, action) => {
      state.loading = false; // → UI render messages
      state.messages = action.payload;
    })
    .addCase(fetchMessages.rejected, (state, action) => {
      state.loading = false; // → UI hiển thị error
      state.error = action.error.message;
    });
};
```

### Flow:

1. **Dispatch fetchMessages** → `pending` → `loading = true`
2. **API success** → `fulfilled` → `loading = false`, `messages = data`
3. **API error** → `rejected` → `loading = false`, `error = message`

---

## Tổng kết Loading Patterns

### 1. **Redux Loading** (Global state)

- Dùng cho: API calls, data fetching
- Ví dụ: `fetchMessages`, `handleLogin`
- Logic: `pending` → `loading = true`, `fulfilled/rejected` → `loading = false`

### 2. **Local Loading** (Component state)

- Dùng cho: UI interactions, form submissions
- Ví dụ: `uploading`, `removingMembers`, `deletingGroup`
- Logic: `setLoading(true)` → action → `setLoading(false)`

### 3. **Optimized Loading** (Custom hooks)

- Dùng cho: Reusable loading logic
- Ví dụ: `useLoading`, `LoadingButton`, `LoadingOverlay`
- Logic: Encapsulated loading state management

### 4. **Loading UI Patterns**

- **Spinner**: `<Spin />` cho loading data
- **Button loading**: `<Button loading={loading}>` cho form submit
- **Overlay**: `<LoadingOverlay>` cho disable form
- **Inline**: Text thay đổi cho navigation
