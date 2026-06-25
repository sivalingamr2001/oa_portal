import { useEffect } from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Spin } from 'antd';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginApi } from '../api/allocationApi';
import Logo from '../lib/constants';
import { useLoader } from '../hooks/useLoader';

export const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { withLoader, loading } = useLoader();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();

  useEffect(() => {
    const urlUsername = searchParams.get('uname');
    const urlPassword = searchParams.get('pwd');

    if (urlUsername && urlPassword) {
      form.setFieldsValue({
        username: urlUsername,
        password: urlPassword,
      });

      executeLogin(urlUsername, urlPassword);
    }
  }, [searchParams, form]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.02)', padding: 16 }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  // Refactored authentication business logic
  const executeLogin = async (username: string, password: string) => {
    try {
      const data = await withLoader(() => loginApi(username, password));
      if (data) {
        login(username, data.region, data.subRegion, 30);
        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // Triggered on manual form submit
  const onFinish = (values: any) => {
    executeLogin(values.username, values.password);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 400, margin: '100px auto' }}>
      <Card title={<div style={{ textAlign: 'center', fontSize: '1.25rem' }}>Welcome back</div>} bordered={true}>
        <div style={{ background: '#f5f5f5', padding: 16, textAlign: 'center', marginBottom: 16 }}>
          <img src={Logo} alt="JANATICS" style={{ maxWidth: '100%' }} />
        </div>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 24 }}>
          Enter your credentials to access your account
        </p>

        <Form
          form={form}
          name="login_form"
          layout="vertical"
          initialValues={{ username: "CBE25225", password: "cbe2janatics" }}
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username/Email" size="large" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
