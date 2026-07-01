import './Modal.css';

export default function Modal({
  open,
  onClose,
  title,
  titleId = 'wiring-modal-title',
  children,
  footer,
  maxWidth = 360,
  closeOnBackdrop = true,
  loading = false,
  className = '',
}) {
  if (!open) return null;

  return (
    <div
      className={`wiring-modal${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <button
        type="button"
        className="wiring-modal__backdrop"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-label="Tutup dialog"
        tabIndex={-1}
        disabled={loading}
      />
      <div className="wiring-modal__panel" style={{ maxWidth }}>
        {title && (
          <h2 id={titleId} className="wiring-modal__title">{title}</h2>
        )}
        {children && <div className="wiring-modal__body">{children}</div>}
        {footer && <div className="wiring-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
