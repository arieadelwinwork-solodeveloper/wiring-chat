import { useState } from 'react';

export const CONTACT_STATUS_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'user', label: 'User' },
  { value: 'bot', label: 'Bot' },
  { value: 'ai_assistant', label: 'AI Assistant' },
];

export function getContactStatusLabel(status) {
  return CONTACT_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

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

  function updateDraft(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!draft.nama.trim() || !draft.nomorId.trim()) return;

    onAddContact({
      id: `contact-${Date.now()}`,
      nama: draft.nama.trim(),
      nomorId: draft.nomorId.trim(),
      status: draft.status,
    });

    onClose();
  }

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
          Tambahkan kontak baru dengan mengisi data berikut.
        </p>

        <label className="invite-friends__field">
          <span className="invite-friends__label">Nama kontak</span>
          <input
            type="text"
            className="invite-friends__input"
            placeholder="Nama lengkap"
            value={draft.nama}
            onChange={(e) => updateDraft('nama', e.target.value)}
          />
        </label>

        <label className="invite-friends__field">
          <span className="invite-friends__label">Nomor ID</span>
          <input
            type="text"
            className="invite-friends__input"
            placeholder="Contoh: USR-003"
            value={draft.nomorId}
            onChange={(e) => updateDraft('nomorId', e.target.value)}
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
            disabled={!draft.nama.trim() || !draft.nomorId.trim()}
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
