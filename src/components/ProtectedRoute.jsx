import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AuthLoadingScreen() {
  return (
    <div className="auth-loading">
      <div className="auth-loading__spinner" aria-hidden />
      <p>Memuat sesi...</p>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
