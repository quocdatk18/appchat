import React from 'react';
import LoadingOverlay from './LoadingOverlay';

/**
 * Props cho withLoading HOC
 */
interface WithLoadingProps {
  /** Trạng thái loading */
  loading?: boolean;
  /** Text hiển thị khi loading */
  loadingText?: string;
  /** Kích thước spinner */
  loadingSize?: 'small' | 'default' | 'large';
  /** Có disable component khi loading hay không (default: true) */
  disableOnLoading?: boolean;
}

/**
 * Higher Order Component (HOC) để wrap component với loading functionality
 *
 * Cách hoạt động:
 * 1. Wrap component với LoadingOverlay
 * 2. Tự động disable component khi loading (nếu disableOnLoading = true)
 * 3. Hiển thị loading overlay khi loading = true
 *
 * @param WrappedComponent - Component cần wrap với loading
 * @returns Component mới với loading props
 */
export const withLoading = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const WithLoadingComponent: React.FC<P & WithLoadingProps> = ({
    loading = false,
    loadingText,
    loadingSize = 'large',
    disableOnLoading = true,
    ...props
  }) => {
    // Nếu disableOnLoading = true và đang loading, thêm disabled prop
    const componentProps = disableOnLoading && loading ? { ...props, disabled: true } : props;

    return (
      <LoadingOverlay loading={loading} text={loadingText} size={loadingSize}>
        <WrappedComponent {...(componentProps as P)} />
      </LoadingOverlay>
    );
  };

  // Set display name cho debugging
  WithLoadingComponent.displayName = `withLoading(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithLoadingComponent;
};
