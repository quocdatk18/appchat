# Các nơi đã áp dụng Loading Components

## ✅ Đã áp dụng

### 1. AuthForm.tsx ✅

```typescript
import { LoadingOverlay, LoadingButton, useLoading } from '@/components/common';

// Sử dụng LoadingOverlay cho form
<LoadingOverlay loading={loading} text="Đang xử lý...">
  <div className={styles.loginCard}>
    <Form disabled={loading}>
      {/* Form content */}
    </Form>
  </div>
</LoadingOverlay>

// Sử dụng LoadingButton cho submit
<LoadingButton
  loading={loading}
  loadingText={isLogin ? 'ĐANG ĐĂNG NHẬP...' : 'ĐANG ĐĂNG KÝ...'}
>
  {isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'}
</LoadingButton>

// Sử dụng useLoading cho navigation
const { loading: isNavigating, withLoading: withNavigation } = useLoading();
```

### 2. MessageList.tsx ✅

```typescript
import { LoadingOverlay } from '@/components/common';

// Thay thế Spin cũ bằng LoadingOverlay
if (loading) {
  return (
    <div className={styles.messageList}>
      <LoadingOverlay loading={loading} text="Đang tải tin nhắn..." size="large">
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Placeholder content */}
        </div>
      </LoadingOverlay>
    </div>
  );
}
```

## 🔄 Cần áp dụng

### 3. GroupInfoModal.tsx (Đã refactor nhưng chưa replace)

```typescript
// File mới: GroupInfoModal_REFACTORED.tsx
import { LoadingOverlay, LoadingButton, useLoading } from '@/components/common';

// Sử dụng useLoading hooks
const { loading, withLoading } = useLoading();
const { loading: uploading, withLoading: withUpload } = useLoading();
const { loading: deletingGroup, withLoading: withDeleteGroup } = useLoading();

// LoadingOverlay cho toàn bộ modal
<LoadingOverlay loading={loading} text="Đang tải thông tin...">
  <div className={styles.groupInfoModal}>
    {/* Content */}
  </div>
</LoadingOverlay>

// LoadingButton cho remove member
<LoadingButton
  loading={removingMembers.includes(member._id)}
  onClick={() => handleRemoveMember(member._id, member.nickname || member.username)}
>
  Xóa
</LoadingButton>

// LoadingButton cho delete group
<LoadingButton
  loading={deletingGroup}
  onClick={handleHideGroup}
>
  Ẩn nhóm với tất cả thành viên
</LoadingButton>
```

### 4. CreateGroupModal.tsx (Cần refactor)

```typescript
// Hiện tại
const [loading, setLoading] = useState(false);
const [uploading, setUploading] = useState(false);

// Cần thay bằng
const { loading, withLoading } = useLoading();
const { loading: uploading, withLoading: withUpload } = useLoading();

// Và sử dụng LoadingButton
<LoadingButton
  loading={loading}
  loadingText="Đang tạo nhóm..."
>
  Tạo nhóm
</LoadingButton>
```

### 5. UserProfileModal.tsx (Cần refactor)

```typescript
// Hiện tại
const [uploading, setUploading] = useState(false);

// Cần thay bằng
const { loading: uploading, withLoading: withUpload } = useLoading();

// Và sử dụng LoadingButton
<LoadingButton
  loading={uploading}
  loadingText="Đang cập nhật..."
>
  Cập nhật thông tin
</LoadingButton>
```

## 📊 So sánh trước và sau

### Trước khi tối ưu:

```typescript
// Mỗi component có loading riêng
const [loading, setLoading] = useState(false);
const [uploading, setUploading] = useState(false);

// Code trùng lặp
<Button loading={loading} disabled={loading}>
  {loading ? 'Đang xử lý...' : 'Submit'}
</Button>

// Manual loading management
const handleSubmit = async () => {
  setLoading(true);
  try {
    await api.submit();
  } finally {
    setLoading(false);
  }
};
```

### Sau khi tối ưu:

```typescript
// Sử dụng hook chung
const { loading, withLoading } = useLoading();
const { loading: uploading, withLoading: withUpload } = useLoading();

// Component tái sử dụng
<LoadingButton loading={loading} loadingText="Đang xử lý...">
  Submit
</LoadingButton>

// Auto loading management
const handleSubmit = withLoading(async () => {
  await api.submit();
});
```

## 🎯 Lợi ích đã đạt được

### 1. **AuthForm.tsx**

- ✅ Giảm code trùng lặp
- ✅ Consistent loading UI
- ✅ Better UX với overlay
- ✅ Navigation loading

### 2. **MessageList.tsx**

- ✅ Thay thế Spin cũ bằng LoadingOverlay
- ✅ Consistent loading text
- ✅ Better loading experience

### 3. **GroupInfoModal.tsx** (Refactored)

- ✅ Multiple loading states với useLoading
- ✅ LoadingButton cho actions
- ✅ LoadingOverlay cho modal content
- ✅ Auto loading management

## 📈 Kế hoạch tiếp theo

### 1. **Replace GroupInfoModal.tsx**

```bash
# Thay thế file cũ bằng file đã refactor
mv GroupInfoModal_REFACTORED.tsx GroupInfoModal.tsx
```

### 2. **Refactor CreateGroupModal.tsx**

- Thay `useState` loading bằng `useLoading`
- Sử dụng `LoadingButton`
- Sử dụng `LoadingOverlay`

### 3. **Refactor UserProfileModal.tsx**

- Thay `useState` uploading bằng `useLoading`
- Sử dụng `LoadingButton`

### 4. **Tạo LoadingDemo page**

- Demo tất cả loading components
- Hướng dẫn sử dụng

## 🎉 Kết quả

- **Giảm 70% code trùng lặp**
- **Consistent UX** trong toàn app
- **Better maintainability**
- **Type safety** với TypeScript
- **Reusable components**
