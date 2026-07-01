import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import SkyBackground from '../components/SkyBackground';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { InternalChatBoard } from '../modules/chat';
import './InternalChat.css';

export default function InternalChat() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useDocumentTitle('Chat · Wiring');

  const handleRoomChange = useCallback((nextRoomId) => {
    if (nextRoomId) {
      navigate(`/chat/${nextRoomId}`, { replace: true });
      return;
    }
    navigate('/chat', { replace: true });
  }, [navigate]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }

  return (
    <div className="internal-chat-page">
      <SkyBackground />

      <button
        type="button"
        className="internal-chat-page__logout"
        onClick={() => setShowLogoutConfirm(true)}
        title={user?.email ? `Keluar (${user.email})` : 'Keluar'}
      >
        Keluar / Logout
      </button>

      <main className="internal-chat-page__main">
        <InternalChatBoard
          initialRoomId={roomId ?? null}
          onRoomChange={handleRoomChange}
        />
      </main>

      <ConfirmModal
        open={showLogoutConfirm}
        title="Keluar dari Wiring?"
        message="Anda akan kembali ke halaman masuk. Percakapan tersimpan di server."
        confirmLabel="Ya, keluar"
        cancelLabel="Batal"
        danger
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => !loggingOut && setShowLogoutConfirm(false)}
      />
    </div>
  );
}
