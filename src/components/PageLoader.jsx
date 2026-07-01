export default function PageLoader({ label = 'Memuat...' }) {
  return (
    <div className="auth-loading">
      <div className="auth-loading__spinner" aria-hidden />
      <p>{label}</p>
    </div>
  );
}
