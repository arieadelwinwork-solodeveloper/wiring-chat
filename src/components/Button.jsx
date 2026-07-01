import { Link } from 'react-router-dom';
import './Button.css';

const VARIANTS = new Set(['primary', 'secondary', 'danger', 'link', 'ghost']);

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  to,
  href,
  children,
  ...props
}) {
  const safeVariant = VARIANTS.has(variant) ? variant : 'primary';
  const classNames = [
    'wiring-btn',
    `wiring-btn--${safeVariant}`,
    `wiring-btn--${size}`,
    fullWidth ? 'wiring-btn--full' : '',
    loading ? 'wiring-btn--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && <span className="wiring-btn__spinner" aria-hidden />}
      <span className="wiring-btn__label">{loading ? 'Memproses...' : children}</span>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={classNames}
        aria-disabled={disabled || loading || undefined}
        onClick={(disabled || loading) ? (event) => event.preventDefault() : props.onClick}
        {...props}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={classNames}
        aria-disabled={disabled || loading || undefined}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </button>
  );
}
