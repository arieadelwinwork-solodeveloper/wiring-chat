import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppRedirect from './components/AppRedirect';
import UnauthorizedHandler from './components/UnauthorizedHandler';
import { AuthProvider } from './contexts/AuthContext';
import InternalChat from './pages/InternalChat';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <UnauthorizedHandler />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/chat/:roomId"
            element={(
              <ProtectedRoute>
                <InternalChat />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/chat"
            element={(
              <ProtectedRoute>
                <InternalChat />
              </ProtectedRoute>
            )}
          />
          <Route path="/" element={<AppRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
