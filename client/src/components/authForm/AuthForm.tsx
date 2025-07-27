'use client';

import { useState } from 'react';
import { Checkbox, Form, Input, notification, Select, Modal, Button } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import styles from './authForm.module.scss';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { AppDispatch, RootState } from '@/lib/store';
import { handleLogin, handleRegister, forgotPassword } from '@/lib/store/reducer/user/userSlice';
import { FieldType } from '@/types';
import { LoadingButton, useLoading } from '@/components/common';
import { useSkeletonLoading } from '@/hooks/useSkeletonLoading';

const { Option } = Select;

interface Props {
  mode: 'login' | 'register';
}

export default function AuthForm({ mode }: Props) {
  const isLogin = mode === 'login';
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();
  const { loading: isNavigating, withLoading: withNavigation } = useLoading();

  // State cho modal quên mật khẩu
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordForm] = Form.useForm();
  const { withLoading: withForgotPassword } = useLoading();

  const checkLogin = pathname === '/login';
  const checkRegister = pathname === '/register';
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.userReducer);

  // Sử dụng skeleton loading hook
  const { showSkeleton, handleRetry, hasError, errorMessage } = useSkeletonLoading({
    loading,
    error,
    retryFn: () => {}, // Auth không cần retry
  });

  // Xử lý quên mật khẩu
  const handleForgotPassword = withForgotPassword(async (values: any) => {
    try {
      const result = await dispatch(forgotPassword({ email: values.email }));
      if (forgotPassword.fulfilled.match(result)) {
        notification.success({
          message: 'Email đã được gửi!',
          description: 'Vui lòng kiểm tra email của bạn để lấy mật khẩu mới.',
        });
        setShowForgotPasswordModal(false);
        forgotPasswordForm.resetFields();
      } else {
        notification.error({
          message: 'Thất bại',
          description: result.payload || 'Không thể gửi email, vui lòng thử lại!',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Lỗi',
        description: 'Có lỗi xảy ra, vui lòng thử lại!',
      });
    }
  });

  const onFinish = async (values: any) => {
    if (checkLogin) {
      const result = await dispatch(handleLogin(values));
      if (handleLogin.fulfilled.match(result)) {
        notification.success({
          message: 'Đăng nhập thành công',
          description: 'Chào mừng bạn quay lại',
        });
        router.push('/');
      } else {
        notification.error({
          message: 'Thất bại',
          description:
            (result.payload as string) || 'Không thể kết nối đến server, vui lòng thử lại',
        });
      }
    } else if (checkRegister) {
      const result1 = await dispatch(handleRegister(values));
      const payload = result1.payload as Record<string, string>;

      if (handleRegister.fulfilled.match(result1)) {
        notification.success({
          message: 'Đăng ký thành công',
          description: 'Vui lòng đăng nhập để bắt đầu cuộc trò chuyện',
        });
        router.push('/');
      } else {
        notification.error({
          message: 'Thất bại',
          description: (
            <div>
              {Object.values(payload).map((msg, idx) => (
                <div key={idx}>• {msg}</div>
              ))}
            </div>
          ),
        });
      }
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.loginCard} ${showSkeleton ? styles.loading : ''}`}>
        <Form
          className={styles.formLogin}
          name="login"
          layout="vertical"
          onFinish={onFinish}
          disabled={loading}
        >
          <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: '#fff' }}>
            {isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
          </h2>

          <div className={styles.inputField}>
            <Form.Item<FieldType>
              name="username"
              rules={[{ required: true, message: 'Cần nhập tên đăng nhập!' }]}
            >
              <Input
                className={styles.input}
                placeholder="Tên Đăng Nhập"
                variant="underlined"
                prefix={<UserOutlined />}
                disabled={loading}
              />
            </Form.Item>
          </div>

          {!isLogin && (
            <div className={styles.inputField}>
              <Form.Item<FieldType>
                name="email"
                rules={[{ required: true, message: 'Cần nhập Email!' }]}
              >
                <Input
                  className={styles.input}
                  placeholder="Email"
                  variant="underlined"
                  prefix={<MailOutlined />}
                  disabled={loading}
                />
              </Form.Item>
            </div>
          )}

          {!isLogin && (
            <div className={styles.inputField}>
              <Form.Item<FieldType>
                name="gender"
                rules={[{ required: true, message: 'Vui lòng chọn giới tính!' }]}
              >
                <Select
                  placeholder="Chọn giới tính"
                  className={styles.genderSelect}
                  disabled={loading}
                >
                  <Option value="male">Nam</Option>
                  <Option value="female">Nữ</Option>
                </Select>
              </Form.Item>
            </div>
          )}

          <div className={styles.inputField}>
            <Form.Item<FieldType>
              name="password"
              rules={[{ required: true, message: 'Cần nhập mật khẩu!' }]}
            >
              <Input.Password
                className={`${styles.input} ${styles.passwordInput}`}
                variant="underlined"
                placeholder="Mật Khẩu"
                prefix={<LockOutlined />}
                disabled={loading}
              />
            </Form.Item>
          </div>

          {isLogin && (
            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
              <Button
                type="link"
                onClick={() => setShowForgotPasswordModal(true)}
                style={{ color: '#fff', padding: 0 }}
              >
                Quên mật khẩu?
              </Button>
            </div>
          )}

          {!isLogin && (
            <div className={styles.inputField}>
              <Form.Item<FieldType>
                name="confirmPassword"
                rules={[{ required: true, message: 'Cần nhập lại mật khẩu!' }]}
              >
                <Input.Password
                  className={`${styles.input} ${styles.passwordInput}`}
                  placeholder="Nhập Lại Mật Khẩu"
                  variant="underlined"
                  prefix={<LockOutlined />}
                  disabled={loading}
                />
              </Form.Item>
            </div>
          )}

          <div className={styles.forget}>
            <Form.Item<FieldType>
              name="remember"
              valuePropName="checked"
              label={null}
              rules={
                !isLogin
                  ? [
                      {
                        validator: (_, value) => {
                          if (value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Vui lòng đồng ý với điều khoản!'));
                        },
                      },
                    ]
                  : []
              }
            >
              <Checkbox disabled={loading}>
                <span style={{ color: '#fff' }}>
                  {isLogin ? 'Ghi nhớ đăng nhập' : 'Đồng ý các điều khoản'}
                </span>
              </Checkbox>
            </Form.Item>
          </div>

          <Form.Item label={null}>
            <LoadingButton
              type="primary"
              htmlType="submit"
              className={styles.button}
              loading={loading}
              loadingText={isLogin ? 'ĐANG ĐĂNG NHẬP...' : 'ĐANG ĐĂNG KÝ...'}
            >
              {isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'}
            </LoadingButton>
          </Form.Item>

          <div className={styles.register}>
            {isLogin ? (
              <p>
                Chưa có tài khoản?{' '}
                <Link
                  href="/register"
                  onClick={() =>
                    withNavigation(() => new Promise((resolve) => setTimeout(resolve, 100)))()
                  }
                  style={{ pointerEvents: isNavigating ? 'none' : 'auto' }}
                >
                  {isNavigating ? 'Đang chuyển...' : 'Đăng ký'}
                </Link>
              </p>
            ) : (
              <p>
                Bạn đã có tài khoản?{' '}
                <Link
                  href="/login"
                  onClick={() =>
                    withNavigation(() => new Promise((resolve) => setTimeout(resolve, 100)))()
                  }
                  style={{ pointerEvents: isNavigating ? 'none' : 'auto' }}
                >
                  {isNavigating ? 'Đang chuyển...' : 'Đăng Nhập'}
                </Link>
              </p>
            )}
          </div>
        </Form>
      </div>

      {/* Modal Quên mật khẩu */}
      <Modal
        open={showForgotPasswordModal}
        onCancel={() => setShowForgotPasswordModal(false)}
        title="Quên mật khẩu"
        footer={null}
        centered
        width={400}
      >
        <Form form={forgotPasswordForm} layout="vertical" onFinish={handleForgotPassword}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' },
            ]}
          >
            <Input placeholder="Nhập email của bạn" prefix={<MailOutlined />} size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Gửi mật khẩu mới
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
