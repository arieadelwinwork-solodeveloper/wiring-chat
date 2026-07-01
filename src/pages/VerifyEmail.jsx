import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import SkyBackground from '../components/SkyBackground';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import './Login.css';

export default function VerifyEmail() {
  const { session, loading, resendVerificationEmail, isConfigured } = useAuth();
  const location = useLocation();
  const [email] = useState(() => location.state?.email ?? '');

  const [sending, setSending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  useDocumentTitle('Verifikasi email · Wiring');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (loading) {
    return (
      <div className="login-page">
        <SkyBackground />
        <div className="auth-loading">
          <div className="auth-loading__spinner" aria-hidden />
          <p>Memuat sesi...</p>
        </div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/chat" replace />;
  }

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  async function handleResend() {
    setError('');
    setResent(false);
    setSending(true);

    try {
      await resendVerificationEmail(email);
      setResent(true);
    } catch (err) {
      setError(err.message || 'Gagal mengirim ulang email verifikasi.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="login-page">
      <SkyBackground />

      <main className="login-page__content">
        <div className="login-card">
          <div className="login-card__brand">
            <span className="login-card__logo" aria-hidden>✉</span>
            <h1 className="login-card__title">Cek email Anda</h1>
            <p className="login-card__subtitle">
              Kami mengirim link verifikasi ke <strong>{email}</strong>
            </p>
          </div>

          {!isConfigured && (
            <p className="login-card__warn">
              Supabase belum dikonfigurasi. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env
            </p>
          )}

          <div className="login-form verify-email__body">
            <p className="verify-email__steps">
              Buka inbox email Anda, klik link verifikasi, lalu kembali ke halaman masuk.
              Jika tidak ada, periksa folder <strong>spam</strong> atau <strong>promosi</strong>.
            </p>

            {resent && (
              <p className="login-form__success" role="status">
                Email verifikasi telah dikirim ulang.
              </p>
            )}

            {error && (
              <p className="login-form__error" role="alert">{error}</p>
            )}

            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={handleResend}
              disabled={!isConfigured}
              loading={sending}
            >
              Kirim ulang email verifikasi
            </Button>

            <Button to="/login" variant="link" fullWidth className="verify-email__login-link">
              Ke halaman masuk
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
