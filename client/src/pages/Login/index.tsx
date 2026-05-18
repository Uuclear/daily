import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Tabs, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../auth/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { username: string; password: string; display_name?: string }) => {
    setLoading(true);
    try {
      await register(values.username, values.password, values.display_name);
      message.success('注册成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Tabs defaultActiveKey="login">
          <Tabs.TabPane tab="登录" key="login">
            <Form onFinish={handleLogin}>
              <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input prefix={<UserOutlined />} placeholder="用户名" />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="密码" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
          <Tabs.TabPane tab="注册" key="register">
            <Form onFinish={handleRegister}>
              <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '至少3个字符' }]}>
                <Input prefix={<UserOutlined />} placeholder="用户名 (3-30位字母数字)" />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '至少6个字符' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="密码 (至少6位)" />
              </Form.Item>
              <Form.Item name="display_name">
                <Input placeholder="显示名称 (可选)" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>注册</Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
