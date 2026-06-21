import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import SkyBackground from '../components/SkyBackground';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

function EyeToggle({ show, onToggle, disabled, labelShow, labelHide }) {
  return (
    <button
      type="button"
      className="login-form__password-toggle"
      onClick={onToggle}
      disabled={disabled}
      aria-label={show ? labelHide : labelShow}
      aria-pressed={show}
    >
      {show ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" strokeLinecap="round" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" strokeLinecap="round" />
          <path d="M1 1l22 22" strokeLinecap="round" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

export default function Login() {
  const { session, loading, signIn, signUp, signInWithOApps, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  const redirectTo = location.state?.from?.pathname ?? '/chat';

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!showRegisterModal) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowRegisterModal(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRegisterModal]);

  if (!loading && session) {
    return <Navigate to={redirectTo} replace />;
  }

  function openRegisterModal() {
    setRegisterError('');
    setRegisterSuccess('');
    setShowRegisterModal(true);
  }

  function closeRegisterModal() {
    if (registering) return;
    setShowRegisterModal(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa Gmail dan password.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOAppsLogin() {
    setError('');
    setOauthLoading(true);

    try {
      await signInWithOApps();
    } catch (err) {
      setError(err.message || 'Gagal masuk dengan akun O\'Apps.');
      setOauthLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (registerPassword !== registerConfirm) {
      setRegisterError('Konfirmasi password tidak cocok.');
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError('Password minimal 6 karakter.');
      return;
    }

    setRegistering(true);

    try {
      const data = await signUp(registerEmail.trim(), registerPassword);

      if (data.session) {
        setShowRegisterModal(false);
        navigate(redirectTo, { replace: true });
        return;
      }

      setRegisterSuccess('Akun berhasil dibuat. Cek Gmail untuk verifikasi, lalu masuk.');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirm('');
    } catch (err) {
      setRegisterError(err.message || 'Pendaftaran gagal. Coba Gmail lain.');
    } finally {
      setRegistering(false);
    }
  }

  const formDisabled = submitting || registering || oauthLoading || !isConfigured;

  return (
    <div className={`login-page${showRegisterModal ? ' login-page--modal-open' : ''}`}>
      <SkyBackground />

      <main className="login-page__content">
        <div className="login-card">
          <div className="login-card__brand">
            <span className="login-card__logo" aria-hidden>☁</span>
            <h1 className="login-card__title">Wiring Chat</h1>
            <p className="login-card__subtitle">Masuk untuk melanjutkan ke Internal Chat</p>
          </div>

          {!isConfigured && (
            <p className="login-card__warn">
              Supabase belum dikonfigurasi. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env
            </p>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-form__field">
              <span>Gmail</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="nama@gmail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={formDisabled}
              />
            </label>

            <div className="login-form__field">
              <span className="login-form__label">Password</span>
              <div className="login-form__password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={formDisabled}
                />
                <EyeToggle
                  show={showPassword}
                  onToggle={() => setShowPassword((prev) => !prev)}
                  disabled={formDisabled}
                  labelShow="Tampilkan password"
                  labelHide="Sembunyikan password"
                />
              </div>
            </div>

            {error && <p className="login-form__error" role="alert">{error}</p>}

            <button
              type="submit"
              className="login-form__submit"
              disabled={formDisabled}
            >
              {submitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="login-divider">
            <span>atau</span>
          </div>

          <button
            type="button"
            className="login-oapps-btn"
            onClick={handleOAppsLogin}
            disabled={formDisabled}
          >
            <span className="login-oapps-btn__icon" aria-hidden>O</span>
            {oauthLoading ? 'Mengalihkan ke O\'Apps...' : 'Masuk dengan akun O\'Apps'}
          </button>

          <button
            type="button"
            className="login-oapps-btn"
            onClick={openRegisterModal}
            disabled={formDisabled}
          >
            <span className="login-oapps-btn__icon" aria-hidden>+</span>
            Pendaftaran Akun Baru
          </button>
        </div>
      </main>

      {showRegisterModal && (
        <div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="register-modal-title">
          <button
            type="button"
            className="login-modal__backdrop"
            onClick={closeRegisterModal}
            aria-label="Tutup popup daftar"
            tabIndex={-1}
          />
          <div className="login-modal__panel">
            <div className="login-modal__header">
              <h2 id="register-modal-title" className="login-modal__title">Daftar akun</h2>
              <button
                type="button"
                className="login-modal__close"
                onClick={closeRegisterModal}
                disabled={registering}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <p className="login-modal__subtitle">Buat akun baru dengan Gmail dan password.</p>

            <form className="login-form login-form--register" onSubmit={handleRegister}>
              <label className="login-form__field">
                <span>Gmail</span>
                <input
                  type="email"
                  name="register-email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="nama@gmail.com"
                  value={registerEmail}
                  onChange={(event) => setRegisterEmail(event.target.value)}
                  required
                  disabled={formDisabled}
                  autoFocus
                />
              </label>

              <div className="login-form__field">
                <span className="login-form__label">Password</span>
                <div className="login-form__password-wrap">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    name="register-password"
                    autoComplete="new-password"
                    placeholder="Buat password"
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    required
                    disabled={formDisabled}
                  />
                  <EyeToggle
                    show={showRegisterPassword}
                    onToggle={() => setShowRegisterPassword((prev) => !prev)}
                    disabled={formDisabled}
                    labelShow="Tampilkan password"
                    labelHide="Sembunyikan password"
                  />
                </div>
              </div>

              <div className="login-form__field">
                <span className="login-form__label">Konfirmasi password</span>
                <div className="login-form__password-wrap">
                  <input
                    type={showRegisterConfirm ? 'text' : 'password'}
                    name="register-confirm"
                    autoComplete="new-password"
                    placeholder="Ulangi password"
                    value={registerConfirm}
                    onChange={(event) => setRegisterConfirm(event.target.value)}
                    required
                    disabled={formDisabled}
                  />
                  <EyeToggle
                    show={showRegisterConfirm}
                    onToggle={() => setShowRegisterConfirm((prev) => !prev)}
                    disabled={formDisabled}
                    labelShow="Tampilkan konfirmasi password"
                    labelHide="Sembunyikan konfirmasi password"
                  />
                </div>
              </div>

              {registerError && (
                <p className="login-form__error" role="alert">{registerError}</p>
              )}

              {registerSuccess && (
                <p className="login-form__success" role="status">{registerSuccess}</p>
              )}

              <button
                type="submit"
                className="login-form__submit login-form__submit--register"
                disabled={formDisabled}
              >
                {registering ? 'Mendaftar...' : 'Daftar akun'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
