import Button from './Button';
import './ConnectionBanner.css';

export default function ConnectionBanner({
  mode = 'offline',
  message,
  onRetry,
  retrying = false,
  canRetry = true,
}) {
  const isOffline = mode === 'offline';

  return (
    <div
      className={`connection-banner connection-banner--${mode}`}
      role="status"
      aria-live="polite"
    >
      <div className="connection-banner__content">
        <span className="connection-banner__icon" aria-hidden>
          {isOffline ? '⊘' : '⚠'}
        </span>
        <p className="connection-banner__message">
          {message ?? (isOffline
            ? 'Tidak ada koneksi internet. Periksa WiFi atau data seluler Anda.'
            : 'Gagal menghubungi server. Coba lagi.')}
        </p>
      </div>
      {canRetry && onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          loading={retrying}
          className="connection-banner__retry"
        >
          Coba lagi
        </Button>
      )}
    </div>
  );
}
