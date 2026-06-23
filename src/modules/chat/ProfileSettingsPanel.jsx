import { useRef, useState } from 'react';
import { resizeImageFile } from '../../lib/resizeImage.js';
import UserAvatar from './UserAvatar.jsx';
import './ProfileSettingsPanel.css';

const AVATAR_COLORS = ['#0a2540', '#5856d6', '#007aff', '#34c759', '#ff9500', '#ff2d55'];

export default function ProfileSettingsPanel({
  user,
  saving = false,
  onSave,
  onClose,
}) {
  const fileInputRef = useRef(null);
  const [name, setName] = useState(user.name);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl ?? null);
  const [pendingImageData, setPendingImageData] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState('');

  const previewUser = {
    name,
    avatarColor,
    avatarUrl: removePhoto ? null : (avatarPreview ?? user.avatarUrl),
    initials: name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?',
  };

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    try {
      const dataUrl = await resizeImageFile(file);
      setAvatarPreview(dataUrl);
      setPendingImageData(dataUrl);
      setRemovePhoto(false);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleRemovePhoto() {
    setAvatarPreview(null);
    setPendingImageData(null);
    setRemovePhoto(true);
    setError('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nama tidak boleh kosong');
      return;
    }

    onSave({
      name: trimmed,
      avatarColor,
      imageData: pendingImageData,
      removePhoto,
    });
  }

  return (
    <div className="profile-settings">
      <header className="profile-settings__header">
        <button
          type="button"
          className="faq-bot-builder__back"
          onClick={onClose}
          aria-label="Kembali"
        >
          &lt;
        </button>
        <h2 className="profile-settings__title">Ubah profil</h2>
      </header>

      <form className="profile-settings__body" onSubmit={handleSubmit}>
        <div className="profile-settings__avatar-block">
          <UserAvatar
            user={previewUser}
            className="profile-settings__avatar"
            imageClassName="profile-settings__avatar"
          />
          <div className="profile-settings__avatar-actions">
            <button
              type="button"
              className="profile-settings__upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              Upload foto
            </button>
            {(avatarPreview || user.avatarUrl) && !removePhoto && (
              <button
                type="button"
                className="profile-settings__remove-btn"
                onClick={handleRemovePhoto}
                disabled={saving}
              >
                Hapus foto
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="profile-settings__file-input"
            onChange={handleFileChange}
          />
        </div>

        <label className="profile-settings__field">
          <span className="profile-settings__label">Nama tampilan</span>
          <input
            type="text"
            className="profile-settings__input"
            placeholder="Nama Anda"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            maxLength={100}
            autoFocus
          />
        </label>

        <div className="profile-settings__field">
          <span className="profile-settings__label">Warna latar (jika tanpa foto)</span>
          <div className="profile-settings__colors">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`profile-settings__color-swatch${
                  avatarColor === color ? ' profile-settings__color-swatch--active' : ''
                }`}
                style={{ background: color }}
                onClick={() => setAvatarColor(color)}
                aria-label={`Warna ${color}`}
                disabled={saving}
              />
            ))}
          </div>
        </div>

        {user.nomorId && (
          <p className="profile-settings__id-hint">
            ID undangan Anda: <strong>{user.nomorId}</strong>
          </p>
        )}

        {error && <p className="profile-settings__error">{error}</p>}

        <div className="profile-settings__actions">
          <button type="button" className="profile-settings__cancel" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="submit" className="profile-settings__submit" disabled={saving || !name.trim()}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
