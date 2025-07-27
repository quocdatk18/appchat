import React from 'react';
import { Spin, Button, Alert } from 'antd';
import { ReloadOutlined, WifiOutlined } from '@ant-design/icons';

interface NetworkLoadingProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  message?: string;
  size?: 'small' | 'default' | 'large';
}

const NetworkLoading: React.FC<NetworkLoadingProps> = ({
  loading,
  error,
  onRetry,
  message = 'Đang tải...',
  size = 'default',
}) => {
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          minHeight: '200px',
        }}
      >
        <Spin size={size} />
        <p style={{ marginTop: '10px', color: '#666' }}>{message}</p>
      </div>
    );
  }

  if (error) {
    const isNetworkError = error.includes('mạng') || error.includes('kết nối');

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          minHeight: '200px',
        }}
      >
        <Alert
          message={error}
          type="warning"
          showIcon
          icon={<WifiOutlined />}
          style={{ marginBottom: '15px', maxWidth: '400px' }}
        />
        {onRetry && (
          <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry} loading={loading}>
            Thử lại
          </Button>
        )}
      </div>
    );
  }

  return null;
};

export default NetworkLoading;
