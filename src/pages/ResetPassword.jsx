import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import SkyBackground from '../components/SkyBackground';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
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

export default function ResetPassword() {
  const {
    session,
    loading,
    authBootstrapDone,
    passwordRecoveryPending,
    completePasswordReset,
    isConfigured,
  } = useAuth();
  const navigate = useNavigate();

  useDocumentTitle('Password baru · Wiring');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ password: '', confirm: '', form: '' });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!loading && authBootstrapDone && session && !passwordRecoveryPending) {
    return <Navigate to="/chat" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldErrors({ password: '', confirm: '', form: '' });

    if (password.length < 8) {
      setFieldErrors({ password: 'Password minimal 8 karakter.', confirm: '', form: '' });
      return;
    }

    if (password !== confirm) {
      setFieldErrors({ password: '', confirm: 'Konfirmasi password tidak cocok.', form: '' });
      return;
    }

    setSubmitting(true);

    try {
      await completePasswordReset(password);
      navigate('/login', {
        replace: true,
        state: {
          passwordResetSuccess: 'Password berhasil diubah. Silakan masuk dengan password baru.',
        },
      });
    } catch (err) {
      setFieldErrors({
        password: '',
        confirm: '',
        form: err.message || 'Gagal mengubah password. Coba lagi.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const canReset = Boolean(session && passwordRecoveryPending);
  const verifying = passwordRecoveryPending && !session && (!authBootstrapDone || loading);
  const formDisabled = submitting || !isConfigured || !canReset;

  return (
    <div className="login-page">
      <SkyBackground />

      <main className="login-page__content">
        <div className="login-card">
          <div className="login-card__brand">
            <span className="login-card__logo" aria-hidden>🔑</span>
            <h1 className="login-card__title">Password baru</h1>
            <p className="login-card__subtitle">
              {verifying
                ? 'Memverifikasi link ubah password...'
                : canReset
                  ? 'Buat password baru, lalu Anda akan diarahkan ke halaman masuk'
                  : 'Link ubah password tidak valid atau sudah kedaluwarsa'}
            </p>
          </div>

          {!isConfigured && (
            <p className="login-card__warn">
              Supabase belum dikonfigurasi. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env
            </p>
          )}

          {verifying ? (
            <p className="login-form__success" role="status">Memuat sesi...</p>
          ) : !canReset ? (
            <div className="login-form">
              <p className="login-form__error" role="alert">
                Buka kembali link ubah password dari email, atau minta link baru dari halaman masuk.
              </p>
              <Link to="/login" className="login-form__submit login-form__submit--link">
                Kembali ke masuk
              </Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-form__field">
                <label className="login-form__label" htmlFor="reset-password">
                  Password baru <span className="login-form__required" aria-hidden>*</span>
                </label>
                <div className="login-form__password-wrap">
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    name="new-password"
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    required
                    disabled={formDisabled}
                    autoFocus
                    aria-invalid={fieldErrors.password ? true : undefined}
                    aria-describedby={fieldDesc('reset-password-hint', 'reset-password-error')}
                  />
                  <EyeToggle
                    show={showPassword}
                    onToggle={() => setShowPassword((prev) => !prev)}
                    disabled={formDisabled}
                    labelShow="Tampilkan password"
                    labelHide="Sembunyikan password"
                  />
                </div>
                <p id="reset-password-hint" className="login-form__hint">Minimal 8 karakter.</p>
                <FieldError id="reset-password-error" message={fieldErrors.password} />
              </div>

              <div className="login-form__field">
                <label className="login-form__label" htmlFor="reset-confirm">
                  Konfirmasi password baru <span className="login-form__required" aria-hidden>*</span>
                </label>
                <div className="login-form__password-wrap">
                  <input
                    id="reset-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder="Ulangi password baru"
                    value={confirm}
                    onChange={(event) => {
                      setConfirm(event.target.value);
                      if (fieldErrors.confirm) setFieldErrors((prev) => ({ ...prev, confirm: '' }));
                    }}
                    required
                    disabled={formDisabled}
                    aria-invalid={fieldErrors.confirm ? true : undefined}
                    aria-describedby={fieldDesc('reset-confirm-error')}
                  />
                  <EyeToggle
                    show={showConfirm}
                    onToggle={() => setShowConfirm((prev) => !prev)}
                    disabled={formDisabled}
                    labelShow="Tampilkan konfirmasi password"
                    labelHide="Sembunyikan konfirmasi password"
                  />
                </div>
                <FieldError id="reset-confirm-error" message={fieldErrors.confirm} />
              </div>

              <FieldError id="reset-form-error" message={fieldErrors.form} />

              <button
                type="submit"
                className="login-form__submit"
                disabled={formDisabled}
              >
                {submitting ? 'Menyimpan...' : 'Simpan & kembali ke masuk'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
