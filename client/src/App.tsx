import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuth } from './auth/AuthContext';
import { Dashboard } from './pages/Dashboard';
import LoginPage from './pages/Login';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ algorithm: theme.defaultAlgorithm }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
