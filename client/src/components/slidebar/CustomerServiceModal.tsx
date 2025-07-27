'use client';

import { Modal, Form, Input, Button, message, notification } from 'antd';
import { CustomerServiceOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { LoadingButton, useLoading } from '@/components/common';
import { sendSupportRequest } from '@/lib/store/reducer/user/userSlice';

const { TextArea } = Input;

interface CustomerServiceModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CustomerServiceModal({ open, onClose }: CustomerServiceModalProps) {
  const user = useSelector((state: RootState) => state.userReducer.user);
  const dispatch = useDispatch<AppDispatch>();
  const [form] = Form.useForm();
  const { loading, withLoading } = useLoading();

  const handleSubmitSupport = withLoading(async (values: any) => {
    try {
      const result = await dispatch(
        sendSupportRequest({
          subject: values.subject,
          message: values.message,
          userEmail: values.userEmail,
          username: user?.username || '',
        })
      );

      if (sendSupportRequest.fulfilled.match(result)) {
        notification.success({
          message: 'Yêu cầu hỗ trợ đã được gửi!',
          description: 'Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
        });
        form.resetFields();
        onClose();
      } else {
        notification.error({
          message: 'Thất bại',
          description: result.payload || 'Không thể gửi yêu cầu hỗ trợ, vui lòng thử lại!',
        });
      }
    } catch (error) {
      message.error('Có lỗi xảy ra, vui lòng thử lại!');
    }
  });

  return (
    <Modal
      open={open}
      onCancel={() => {
        if (!loading) onClose();
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CustomerServiceOutlined style={{ color: '#1890ff' }} />
          Hỗ trợ khách hàng
        </div>
      }
      footer={null}
      centered
      width={500}
      maskClosable={!loading}
      closable={!loading}
    >
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#666', marginBottom: '8px' }}>
          Xin chào <strong>{user?.nickname || user?.username}</strong>!
        </p>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Bạn cần hỗ trợ gì? Hãy mô tả vấn đề của bạn và chúng tôi sẽ liên hệ trong thời gian sớm
          nhất.
        </p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmitSupport}
        initialValues={{
          userEmail: user?.email || '',
          username: user?.username || '',
        }}
        disabled={loading}
      >
        <Form.Item
          name="subject"
          label="Tiêu đề"
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
        >
          <Input placeholder="Nhập tiêu đề yêu cầu hỗ trợ" prefix={<UserOutlined />} size="large" />
        </Form.Item>

        <Form.Item
          name="message"
          label="Nội dung"
          rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
        >
          <TextArea placeholder="Mô tả chi tiết vấn đề của bạn..." rows={6} size="large" />
        </Form.Item>

        <Form.Item
          name="userEmail"
          label="Email liên hệ"
          rules={[
            { required: true, message: 'Vui lòng nhập email!' },
            { type: 'email', message: 'Email không hợp lệ!' },
          ]}
        >
          <Input placeholder="Email để nhận phản hồi" prefix={<MailOutlined />} size="large" />
        </Form.Item>

        <Form.Item>
          <LoadingButton
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            icon={<CustomerServiceOutlined />}
          >
            Gửi yêu cầu hỗ trợ
          </LoadingButton>
        </Form.Item>
      </Form>

      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h4 style={{ marginBottom: '8px', color: '#333' }}>Thông tin liên hệ:</h4>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
          📧 Email: quocdatlop109@gmail.com
        </p>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>📞 Hotline: 1900-xxxx</p>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
          ⏰ Thời gian: 8:00 - 18:00 (Thứ 2 - Thứ 6)
        </p>
      </div>
    </Modal>
  );
}
