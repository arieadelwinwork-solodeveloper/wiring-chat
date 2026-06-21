import { useNavigate } from 'react-router-dom';
import SkyBackground from '../components/SkyBackground';
import { useAuth } from '../contexts/AuthContext';
import { InternalChatBoard } from '../modules/chat';
import './InternalChat.css';

export default function InternalChat() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="internal-chat-page">
      <SkyBackground />

      <button
        type="button"
        className="internal-chat-page__logout"
        onClick={handleLogout}
        title={user?.email ? `Keluar (${user.email})` : 'Keluar'}
      >
        Keluar / Logout
      </button>

      <main className="internal-chat-page__main">
        <InternalChatBoard />
      </main>
    </div>
  );
}
