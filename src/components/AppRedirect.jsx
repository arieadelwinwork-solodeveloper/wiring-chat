import { Navigate, useLocation } from 'react-router-dom';
import RecoveryRedirect from './RecoveryRedirect';
import { useAuth } from '../contexts/AuthContext';

function AuthLoadingScreen() {
  return (
    <div className="auth-loading">
      <div className="auth-loading__spinner" aria-hidden />
      <p>Memuat sesi...</p>
    </div>
  );
}

export default function AppRedirect() {
  const { session, loading, passwordRecoveryPending } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (passwordRecoveryPending) {
    return <RecoveryRedirect />;
  }

  if (session) {
    return <Navigate to="/chat" replace />;
  }

  return <Navigate to="/login" replace />;
}
