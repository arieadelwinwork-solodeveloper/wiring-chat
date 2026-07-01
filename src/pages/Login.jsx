import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import SkyBackground from '../components/SkyBackground';
import RecoveryRedirect from '../components/RecoveryRedirect';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { DEV_ACCOUNTS, showDevLogin } from '../lib/devAccounts';
import './Login.css';

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="login-form__field-error" role="alert">
      {message}
    </p>
  );
}

function fieldDesc(...ids) {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}

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
  const {
    session,
    loading,
    passwordRecoveryPending,
    signIn,
    signUp,
    signInWithOApps,
    requestMagicLink,
    requestPasswordResetLink,
    isConfigured,
  } = useAuth();
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
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMode, setForgotMode] = useState('magic');
  const [submitting, setSubmitting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState({ email: '', password: '', form: '' });
  const [registerErrors, setRegisterErrors] = useState({ email: '', password: '', confirm: '' });
  const [forgotErrors, setForgotErrors] = useState({ email: '', form: '' });
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(
    location.state?.passwordResetSuccess ?? location.state?.sessionExpired ?? '',
  );

  useDocumentTitle('Masuk · Wiring');

  /** Selalu ke daftar chat — jangan restore deep link room dari sesi sebelumnya. */
  const postLoginPath = '/chat';

  useEffect(() => {
    if (location.state?.passwordResetSuccess || location.state?.sessionExpired) {
      setLoginSuccess(location.state.passwordResetSuccess ?? location.state.sessionExpired);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!showRegisterModal && !showForgotModal) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (showForgotModal) setShowForgotModal(false);
        else setShowRegisterModal(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRegisterModal, showForgotModal]);

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

  if (!loading && session) {
    if (passwordRecoveryPending) {
      return <RecoveryRedirect />;
    }
    return <Navigate to={postLoginPath} replace />;
  }

  function openRegisterModal() {
    setRegisterErrors({ email: '', password: '', confirm: '' });
    setRegisterSuccess('');
    setShowRegisterModal(true);
  }

  function closeRegisterModal() {
    if (registering) return;
    setShowRegisterModal(false);
  }

  function openForgotModal() {
    setForgotErrors({ email: '', form: '' });
    setForgotSuccess('');
    setForgotMode('magic');
    setForgotEmail(email.trim());
    setShowForgotModal(true);
  }

  function closeForgotModal() {
    if (forgotSending) return;
    setShowForgotModal(false);
  }

  async function handleForgotSend(mode) {
    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) {
      setForgotErrors({ email: 'Masukkan email terdaftar.', form: '' });
      return;
    }

    setForgotErrors({ email: '', form: '' });
    setForgotSuccess('');
    setForgotSending(true);
    setForgotMode(mode);

    try {
      if (mode === 'magic') {
        await requestMagicLink(trimmedEmail);
        setForgotSuccess('Magic link telah dikirim. Cek inbox email Anda (termasuk folder spam) dan klik link untuk masuk tanpa password. Link berlaku sekali pakai.');
      } else {
        await requestPasswordResetLink(trimmedEmail);
        setForgotSuccess('Link ubah password telah dikirim. Cek inbox email Anda (termasuk folder spam), buat password baru, lalu masuk kembali. Link berlaku sekali pakai.');
      }
    } catch (err) {
      setForgotErrors({
        email: '',
        form: err.message || (mode === 'magic'
          ? 'Gagal mengirim magic link. Coba lagi.'
          : 'Gagal mengirim link ubah password. Coba lagi.'),
      });
    } finally {
      setForgotSending(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoginErrors({ email: '', password: '', form: '' });
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      navigate(postLoginPath, { replace: true });
    } catch (err) {
      setLoginErrors({
        email: '',
        password: err.message || 'Login gagal. Periksa email dan password.',
        form: '',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOAppsLogin() {
    setLoginErrors({ email: '', password: '', form: '' });
    setOauthLoading(true);

    try {
      await signInWithOApps();
    } catch (err) {
      setLoginErrors({
        email: '',
        password: '',
        form: err.message || 'Gagal masuk dengan akun O\'Apps.',
      });
      setOauthLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setRegisterErrors({ email: '', password: '', confirm: '' });
    setRegisterSuccess('');

    if (registerPassword !== registerConfirm) {
      setRegisterErrors({ email: '', password: '', confirm: 'Konfirmasi password tidak cocok.' });
      return;
    }

    if (registerPassword.length < 8) {
      setRegisterErrors({ email: '', password: 'Password minimal 8 karakter.', confirm: '' });
      return;
    }

    setRegistering(true);

    try {
      const data = await signUp(registerEmail.trim(), registerPassword);

      if (data.session) {
        setShowRegisterModal(false);
        navigate(postLoginPath, { replace: true });
        return;
      }

      const registeredEmail = registerEmail.trim();
      setShowRegisterModal(false);
      navigate('/verify-email', { replace: true, state: { email: registeredEmail } });
    } catch (err) {
      setRegisterErrors({
        email: err.message || 'Pendaftaran gagal. Coba email lain.',
        password: '',
        confirm: '',
      });
    } finally {
      setRegistering(false);
    }
  }

  const formDisabled = submitting || registering || forgotSending || oauthLoading || !isConfigured;

  function fillDevAccount(account) {
    setEmail(account.email);
    setPassword(account.password);
    setLoginErrors({ email: '', password: '', form: '' });
    setLoginSuccess('');
  }

  return (
    <div className={`login-page${showRegisterModal || showForgotModal ? ' login-page--modal-open' : ''}`}>
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

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label className="login-form__field" htmlFor="login-email">
              <span>Email <span className="login-form__required" aria-hidden>*</span></span>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (loginErrors.email) setLoginErrors((prev) => ({ ...prev, email: '' }));
                }}
                required
                disabled={formDisabled}
                aria-invalid={loginErrors.email ? true : undefined}
                aria-describedby={fieldDesc('login-email-error')}
              />
            </label>
            <FieldError id="login-email-error" message={loginErrors.email} />

            <div className="login-form__field">
              <label className="login-form__label" htmlFor="login-password">
                Password <span className="login-form__required" aria-hidden>*</span>
              </label>
              <div className="login-form__password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (loginErrors.password) setLoginErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  required
                  disabled={formDisabled}
                  aria-invalid={loginErrors.password ? true : undefined}
                  aria-describedby={fieldDesc('login-password-error')}
                />
                <EyeToggle
                  show={showPassword}
                  onToggle={() => setShowPassword((prev) => !prev)}
                  disabled={formDisabled}
                  labelShow="Tampilkan password"
                  labelHide="Sembunyikan password"
                />
              </div>
              <button
                type="button"
                className="login-form__forgot"
                onClick={openForgotModal}
                disabled={formDisabled}
              >
                Lupa password?
              </button>
              <FieldError id="login-password-error" message={loginErrors.password} />
            </div>

            {loginSuccess && (
              <p className="login-form__success" role="status">{loginSuccess}</p>
            )}

            <FieldError id="login-form-error" message={loginErrors.form} />

            <button
              type="submit"
              className="login-form__submit"
              disabled={formDisabled}
            >
              {submitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {showDevLogin && (
            <div className="login-dev-cards" aria-label="Akun dummy pengujian">
              <p className="login-dev-cards__title">Dev — isi cepat</p>
              <div className="login-dev-cards__grid">
                {DEV_ACCOUNTS.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    className="login-dev-card"
                    disabled={formDisabled}
                    onClick={() => fillDevAccount(account)}
                  >
                    <span className="login-dev-card__label">{account.label}</span>
                    <span className="login-dev-card__email">{account.email}</span>
                    <span className="login-dev-card__hint">{account.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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

            <p className="login-modal__subtitle">Buat akun baru dengan email dan password.</p>

            <form className="login-form login-form--register" onSubmit={handleRegister} noValidate>
              <label className="login-form__field" htmlFor="register-email">
                <span>Email <span className="login-form__required" aria-hidden>*</span></span>
                <input
                  id="register-email"
                  type="email"
                  name="register-email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="nama@email.com"
                  value={registerEmail}
                  onChange={(event) => {
                    setRegisterEmail(event.target.value);
                    if (registerErrors.email) setRegisterErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  required
                  disabled={formDisabled}
                  autoFocus
                  aria-invalid={registerErrors.email ? true : undefined}
                  aria-describedby={fieldDesc('register-email-error')}
                />
              </label>
              <FieldError id="register-email-error" message={registerErrors.email} />

              <div className="login-form__field">
                <label className="login-form__label" htmlFor="register-password">
                  Password <span className="login-form__required" aria-hidden>*</span>
                </label>
                <div className="login-form__password-wrap">
                  <input
                    id="register-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    name="register-password"
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    value={registerPassword}
                    onChange={(event) => {
                      setRegisterPassword(event.target.value);
                      if (registerErrors.password) setRegisterErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    required
                    disabled={formDisabled}
                    aria-invalid={registerErrors.password ? true : undefined}
                    aria-describedby={fieldDesc('register-password-hint', 'register-password-error')}
                  />
                  <EyeToggle
                    show={showRegisterPassword}
                    onToggle={() => setShowRegisterPassword((prev) => !prev)}
                    disabled={formDisabled}
                    labelShow="Tampilkan password"
                    labelHide="Sembunyikan password"
                  />
                </div>
                <p id="register-password-hint" className="login-form__hint">Minimal 8 karakter.</p>
                <FieldError id="register-password-error" message={registerErrors.password} />
              </div>

              <div className="login-form__field">
                <label className="login-form__label" htmlFor="register-confirm">
                  Konfirmasi password <span className="login-form__required" aria-hidden>*</span>
                </label>
                <div className="login-form__password-wrap">
                  <input
                    id="register-confirm"
                    type={showRegisterConfirm ? 'text' : 'password'}
                    name="register-confirm"
                    autoComplete="new-password"
                    placeholder="Ulangi password"
                    value={registerConfirm}
                    onChange={(event) => {
                      setRegisterConfirm(event.target.value);
                      if (registerErrors.confirm) setRegisterErrors((prev) => ({ ...prev, confirm: '' }));
                    }}
                    required
                    disabled={formDisabled}
                    aria-invalid={registerErrors.confirm ? true : undefined}
                    aria-describedby={fieldDesc('register-confirm-error')}
                  />
                  <EyeToggle
                    show={showRegisterConfirm}
                    onToggle={() => setShowRegisterConfirm((prev) => !prev)}
                    disabled={formDisabled}
                    labelShow="Tampilkan konfirmasi password"
                    labelHide="Sembunyikan konfirmasi password"
                  />
                </div>
                <FieldError id="register-confirm-error" message={registerErrors.confirm} />
              </div>

              {registerSuccess && (
                <>
                  <p className="login-form__success" role="status">{registerSuccess}</p>
                  <button
                    type="button"
                    className="login-form__submit login-form__submit--register"
                    onClick={() => {
                      setShowRegisterModal(false);
                      setRegisterSuccess('');
                    }}
                  >
                    Ke halaman masuk
                  </button>
                </>
              )}

              {!registerSuccess && (
              <button
                type="submit"
                className="login-form__submit login-form__submit--register"
                disabled={formDisabled}
              >
                {registering ? 'Mendaftar...' : 'Daftar akun'}
              </button>
              )}
            </form>
          </div>
        </div>
      )}

      {showForgotModal && (
        <div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="forgot-modal-title">
          <button
            type="button"
            className="login-modal__backdrop"
            onClick={closeForgotModal}
            aria-label="Tutup popup lupa password"
            tabIndex={-1}
          />
          <div className="login-modal__panel">
            <div className="login-modal__header">
              <h2 id="forgot-modal-title" className="login-modal__title">Lupa password</h2>
              <button
                type="button"
                className="login-modal__close"
                onClick={closeForgotModal}
                disabled={forgotSending}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <p className="login-modal__subtitle">
              Masukkan email terdaftar, lalu pilih cara pemulihan akun.
            </p>

            <form
              className="login-form login-form--register"
              onSubmit={(event) => {
                event.preventDefault();
                handleForgotSend(forgotMode);
              }}
            >
              <label className="login-form__field" htmlFor="forgot-email">
                <span>Email <span className="login-form__required" aria-hidden>*</span></span>
                <input
                  id="forgot-email"
                  type="email"
                  name="forgot-email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="nama@email.com"
                  value={forgotEmail}
                  onChange={(event) => {
                    setForgotEmail(event.target.value);
                    if (forgotErrors.email) setForgotErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  required
                  disabled={formDisabled}
                  autoFocus
                  aria-invalid={forgotErrors.email ? true : undefined}
                  aria-describedby={fieldDesc('forgot-email-error', 'forgot-form-error')}
                />
              </label>
              <FieldError id="forgot-email-error" message={forgotErrors.email} />

              <fieldset className="login-forgot-options" disabled={formDisabled || Boolean(forgotSuccess)}>
                <legend className="login-forgot-options__legend">Pilih metode</legend>

                <label className={`login-forgot-option${forgotMode === 'magic' ? ' login-forgot-option--active' : ''}`}>
                  <input
                    type="radio"
                    name="forgot-mode"
                    value="magic"
                    checked={forgotMode === 'magic'}
                    onChange={() => setForgotMode('magic')}
                    className="login-forgot-option__input"
                  />
                  <span className="login-forgot-option__content">
                    <span className="login-forgot-option__title">Magic link</span>
                    <span className="login-forgot-option__desc">Masuk langsung tanpa password lewat link di email.</span>
                  </span>
                </label>

                <label className={`login-forgot-option${forgotMode === 'reset' ? ' login-forgot-option--active' : ''}`}>
                  <input
                    type="radio"
                    name="forgot-mode"
                    value="reset"
                    checked={forgotMode === 'reset'}
                    onChange={() => setForgotMode('reset')}
                    className="login-forgot-option__input"
                  />
                  <span className="login-forgot-option__content">
                    <span className="login-forgot-option__title">Link ubah password</span>
                    <span className="login-forgot-option__desc">Halaman password baru, lalu masuk ulang dengan password baru.</span>
                  </span>
                </label>
              </fieldset>

              <FieldError id="forgot-form-error" message={forgotErrors.form} />

              {forgotSuccess && (
                <p className="login-form__success" role="status">{forgotSuccess}</p>
              )}

              <button
                type="submit"
                className="login-form__submit login-form__submit--register"
                disabled={formDisabled || Boolean(forgotSuccess)}
              >
                {forgotSending ? 'Mengirim...' : 'Konfirmasi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
