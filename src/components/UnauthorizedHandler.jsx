import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { setUnauthorizedHandler } from '../services/chatApi';

export default function UnauthorizedHandler() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await signOut();
      navigate('/login', {
        replace: true,
        state: { sessionExpired: 'Sesi berakhir. Silakan masuk kembali.' },
      });
    });

    return () => setUnauthorizedHandler(null);
  }, [signOut, navigate]);

  return null;
}
