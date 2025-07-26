'use client';

import { Checkbox, Form, Input, notification, Select } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import styles from './authForm.module.scss';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { AppDispatch, RootState } from '@/lib/store';
import { handleLogin, handleRegister } from '@/lib/store/reducer/user/userSlice';
import { FieldType } from '@/types';
import { LoadingOverlay, LoadingButton, useLoading } from '@/components/common';

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

  const checkLogin = pathname === '/login';
  const checkRegister = pathname === '/register';
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.userReducer);

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
      <LoadingOverlay loading={loading} text="Đang xử lý...">
        <div className={styles.loginCard}>
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
              <Form.Item<FieldType> name="remember" valuePropName="checked" label={null}>
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
      </LoadingOverlay>
    </div>
  );
}
