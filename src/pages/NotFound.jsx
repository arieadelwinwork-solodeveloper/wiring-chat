import Button from '../components/Button';
import SkyBackground from '../components/SkyBackground';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import './Login.css';

export default function NotFound() {
  useDocumentTitle('Halaman tidak ditemukan · Wiring');

  return (
    <div className="login-page">
      <SkyBackground />

      <main className="login-page__content">
        <div className="login-card">
          <div className="login-card__brand">
            <span className="login-card__logo" aria-hidden>404</span>
            <h1 className="login-card__title">Halaman tidak ditemukan</h1>
            <p className="login-card__subtitle">
              URL yang Anda buka tidak ada atau sudah dipindahkan.
            </p>
          </div>

          <div className="login-form not-found__actions">
            <Button to="/login" variant="primary" fullWidth>
              Ke halaman masuk
            </Button>
            <Button to="/chat" variant="link" fullWidth>
              Ke Internal Chat
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
