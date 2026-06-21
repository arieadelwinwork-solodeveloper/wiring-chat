import './MessageHoldMenu.css';

export default function MessageHoldMenu({ x, y, onCopy, onDelete, onClose }) {
  return (
    <>
      <button
        type="button"
        className="message-hold-menu__backdrop"
        aria-label="Tutup menu"
        onClick={onClose}
      />
      <div
        className="message-hold-menu"
        style={{ top: y, left: x }}
        role="menu"
      >
        <button type="button" className="message-hold-menu__item" role="menuitem" onClick={onCopy}>
          Copy
        </button>
        <button type="button" className="message-hold-menu__item message-hold-menu__item--danger" role="menuitem" onClick={onDelete}>
          Delete
        </button>
      </div>
    </>
  );
}
