import React from 'react';
import { Spin } from 'antd';
import styles from './LoadingOverlay.module.scss';

/**
 * Props cho LoadingOverlay component
 */
interface LoadingOverlayProps {
  /** Trạng thái loading */
  loading: boolean;
  /** Text hiển thị khi loading (optional) */
  text?: string;
  /** Kích thước spinner: 'small' | 'default' | 'large' */
  size?: 'small' | 'default' | 'large';
  /** Có hiển thị overlay hay không (default: true) */
  overlay?: boolean;
  /** Children components */
  children?: React.ReactNode;
}

/**
 * Component LoadingOverlay - Hiển thị loading overlay hoặc inline loading
 *
 * Có 2 mode:
 * 1. Overlay mode (default): Hiển thị overlay phủ lên children
 * 2. Inline mode: Hiển thị loading inline với spinner và text
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  text = 'Đang xử lý...',
  size = 'large',
  overlay = true,
  children,
}) => {
  // Nếu không loading thì render children bình thường
  if (!loading) {
    return <>{children}</>;
  }

  // Inline loading mode - hiển thị spinner và text inline
  if (!overlay) {
    return (
      <div className={styles.inlineLoading}>
        <Spin size={size} />
        {text && <span className={styles.loadingText}>{text}</span>}
      </div>
    );
  }

  // Overlay mode - hiển thị overlay phủ lên children
  return (
    <div className={styles.container}>
      {/* Render children components */}
      {children}
      {/* Loading overlay với spinner và text */}
      <div className={styles.overlay}>
        <Spin size={size} />
        {text && <p className={styles.loadingText}>{text}</p>}
      </div>
    </div>
  );
};

export default LoadingOverlay;
