import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { InviteLandingPage } from './features/servers/InviteLandingPage';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="h-screen w-screen bg-[#313338] flex items-center justify-center text-white">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

import { AppLayout } from './layouts/AppLayout';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/invite/:code" element={<InviteLandingPage />} />
      <Route path="/channels/*" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/channels/@me" />} />
    </Routes>
  );
}

import { SocketProvider } from './features/socket/SocketContext';
import { NotificationProvider } from './features/notifications/NotificationContext';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <Router>
            <AppRoutes />
          </Router>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
