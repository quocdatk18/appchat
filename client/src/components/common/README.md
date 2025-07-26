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
