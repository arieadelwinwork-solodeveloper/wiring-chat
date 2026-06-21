import './MessageSelectionBar.css';

export default function MessageSelectionBar({
  mode,
  count,
  onCancel,
  onConfirm,
}) {
  const isCopy = mode === 'copy';

  return (
    <div className={`message-selection-bar message-selection-bar--${mode}`}>
      <button type="button" className="message-selection-bar__cancel" onClick={onCancel}>
        Batal
      </button>
      <span className="message-selection-bar__label">
        {isCopy ? 'Pilih pesan untuk disalin' : 'Pilih pesan untuk dihapus'}
        {count > 0 && ` · ${count} dipilih`}
      </span>
      <button
        type="button"
        className={`message-selection-bar__confirm${isCopy ? '' : ' message-selection-bar__confirm--danger'}`}
        disabled={count === 0}
        onClick={onConfirm}
      >
        {isCopy ? 'Salin' : 'Hapus'}
      </button>
    </div>
  );
}
