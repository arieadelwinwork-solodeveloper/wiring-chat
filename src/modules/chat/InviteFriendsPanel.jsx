import { useEffect, useState } from 'react';
import { chatApi } from '../../services/chatApi.js';

export const CONTACT_STATUS_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'user', label: 'User' },
  { value: 'bot', label: 'Bot' },
  { value: 'ai_assistant', label: 'AI Assistant' },
];

export function getContactStatusLabel(status) {
  return CONTACT_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

const NOMOR_ID_PATTERN = /^USR-[0-9A-Z]+$/i;

function createContactDraft() {
  return {
    nama: '',
    nomorId: '',
    status: 'user',
  };
}

export function InviteFriendsTrigger({ onClick }) {
  return (
    <button type="button" className="invite-friends__trigger" onClick={onClick}>
      <span className="invite-friends__trigger-icon">+</span>
      <span>Mengundang teman</span>
    </button>
  );
}

export default function InviteFriendsForm({ onAddContact, onClose }) {
  const [draft, setDraft] = useState(createContactDraft);
  const [lookupState, setLookupState] = useState('idle');
  const [lookupError, setLookupError] = useState('');

  function updateDraft(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (field === 'nomorId') {
      setLookupState('idle');
      setLookupError('');
    }
  }

  useEffect(() => {
    const nomorId = draft.nomorId.trim().toUpperCase();
    if (!NOMOR_ID_PATTERN.test(nomorId)) {
      setLookupState('idle');
      setLookupError('');
      return undefined;
    }

    if (!chatApi.isEnabled()) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLookupState('loading');
      setLookupError('');

      chatApi.lookupUserByNomorId(nomorId)
        .then(({ user }) => {
          if (cancelled) return;
          setDraft((prev) => ({
            ...prev,
            nomorId: user.nomorId ?? nomorId,
            nama: user.nama,
            status: user.role ?? prev.status,
          }));
          setLookupState('found');
        })
        .catch((err) => {
          if (cancelled) return;
          setLookupState('not_found');
          setLookupError(err.message);
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draft.nomorId]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!draft.nama.trim() || !draft.nomorId.trim()) return;

    onAddContact({
      id: `contact-${Date.now()}`,
      nama: draft.nama.trim(),
      nomorId: draft.nomorId.trim().toUpperCase(),
      status: draft.status,
    });

    onClose();
  }

  const nomorIdHint = lookupState === 'loading'
    ? 'Mencari pengguna...'
    : lookupState === 'found'
      ? `Ditemukan: ${draft.nama}`
      : lookupState === 'not_found'
        ? lookupError
        : '';

  return (
    <div className="invite-friends-form">
      <header className="invite-friends-form__header">
        <button
          type="button"
          className="faq-bot-builder__back"
          onClick={onClose}
          aria-label="Kembali"
        >
          &lt;
        </button>
        <h2 className="invite-friends-form__title">Mengundang teman</h2>
      </header>

      <form className="invite-friends-form__body" onSubmit={handleSubmit}>
        <p className="faq-bot-flow-hint">
          Minta ID teman (contoh USR-A1B2C3) dari profil mereka di sidebar. Nama akan terisi otomatis.
        </p>

        <label className="invite-friends__field">
          <span className="invite-friends__label">Nomor ID</span>
          <input
            type="text"
            className="invite-friends__input"
            placeholder="Contoh: USR-A1B2C3"
            value={draft.nomorId}
            onChange={(e) => updateDraft('nomorId', e.target.value)}
            autoComplete="off"
          />
          {nomorIdHint && (
            <span
              className={`invite-friends__hint${
                lookupState === 'not_found' ? ' invite-friends__hint--error' : ''
              }`}
            >
              {nomorIdHint}
            </span>
          )}
        </label>

        <label className="invite-friends__field">
          <span className="invite-friends__label">Nama kontak</span>
          <input
            type="text"
            className="invite-friends__input"
            placeholder="Terisi otomatis dari ID"
            value={draft.nama}
            onChange={(e) => updateDraft('nama', e.target.value)}
            readOnly={lookupState === 'found'}
          />
        </label>

        <label className="invite-friends__field">
          <span className="invite-friends__label">Status akun</span>
          <select
            className="invite-friends__input invite-friends__select"
            value={draft.status}
            onChange={(e) => updateDraft('status', e.target.value)}
          >
            {CONTACT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="invite-friends__actions">
          <button type="button" className="invite-friends__cancel" onClick={onClose}>
            Batal
          </button>
          <button
            type="submit"
            className="invite-friends__submit"
            disabled={
              !draft.nama.trim()
              || !draft.nomorId.trim()
              || lookupState === 'loading'
              || lookupState === 'not_found'
            }
          >
            Tambah kontak
          </button>
        </div>
      </form>
    </div>
  );
}

export function contactToRoom(contact) {
  const avatarMap = {
    owner: '#0a2540',
    user: '#007aff',
    bot: '#5ac8fa',
    ai_assistant: '#1a3a5c',
  };

  const initials = contact.nama
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return {
    id: `contact-${contact.id}`,
    nama_room: contact.nama,
    tipe: 'contact',
    avatar: avatarMap[contact.status] ?? '#86868b',
    initials,
    lastMessage: `${contact.nomorId} · ${getContactStatusLabel(contact.status)}`,
    lastTime: '',
    isContact: true,
    contactStatus: contact.status,
  };
}

export function OwnerBotsList({ botRooms, activeRoomId, onSelectRoom }) {
  if (!botRooms.length) return null;

  return (
    <div className="owner-bots-list">
      <span className="owner-bots-list__label">Bot & AI Assistant</span>
      <ul className="owner-bots-list__items">
        {botRooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              className={`owner-bots-list__item${room.id === activeRoomId ? ' owner-bots-list__item--active' : ''}`}
              onClick={() => onSelectRoom(room.id)}
            >
              <div
                className="owner-bots-list__avatar"
                style={{ background: room.avatar }}
              >
                {room.initials}
              </div>
              <div className="owner-bots-list__info">
                <span className="owner-bots-list__name">{room.nama_room}</span>
                <span className="owner-bots-list__meta">{room.lastMessage}</span>
              </div>
              <span className="chat-room-item__bot-badge">{room.statusLabel}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
