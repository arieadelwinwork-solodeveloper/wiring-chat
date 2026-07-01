import { Navigate, useLocation } from 'react-router-dom';
import { buildResetPasswordPath } from '../lib/authRecovery';

export default function RecoveryRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={buildResetPasswordPath(location.search, location.hash)}
      replace
    />
  );
}
