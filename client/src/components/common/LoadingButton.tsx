import React from 'react';
import { Button, ButtonProps } from 'antd';

/**
 * Props cho LoadingButton component
 * Extends từ Ant Design ButtonProps
 */
interface LoadingButtonProps extends ButtonProps {
  /** Trạng thái loading */
  loading?: boolean;
  /** Text hiển thị khi loading (thay thế children) */
  loadingText?: string;
  /** Children components (text của button) */
  children: React.ReactNode;
}

/**
 * LoadingButton - Button component với loading state tích hợp
 *
 * Features:
 * - Tự động disable khi loading
 * - Thay đổi text khi loading
 * - Kế thừa tất cả props của Ant Design Button
 */
const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  children,
  ...buttonProps
}) => {
  // Quyết định text hiển thị: loadingText nếu loading, ngược lại là children
  const buttonText = loading && loadingText ? loadingText : children;

  return (
    <Button
      {...buttonProps}
      loading={loading}
      // Disable button khi loading hoặc khi buttonProps.disabled = true
      disabled={loading || buttonProps.disabled}
    >
      {buttonText}
    </Button>
  );
};

export default LoadingButton;
