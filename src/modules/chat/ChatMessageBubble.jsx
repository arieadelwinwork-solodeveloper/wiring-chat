import { useRef } from 'react';
import { formatMessageTime } from './messageFormat';
import { sanitizeText } from '../../lib/sanitize';
import './ChatMessageBubble.css';

const HOLD_MS = 450;
const MOVE_CANCEL_PX = 10;

export default function ChatMessageBubble({
  message,
  currentUserName,
  currentUserId = 'user-me',
  selectionMode,
  isSelected,
  onHold,
  onToggleSelect,
}) {
  const isOwn = message.sender_id === currentUserId;
  const isAi = message.sender_role === 'ai';

  let modifier = 'other';
  if (isOwn) modifier = 'own';
  else if (isAi) modifier = 'ai';
  else modifier = 'staff';

  const senderLabel = sanitizeText(isOwn ? currentUserName : message.sender_name);
  const messageText = sanitizeText(message.teks_pesan);
  const holdTimerRef = useRef(null);
  const startPointRef = useRef({ x: 0, y: 0 });
  const holdTriggeredRef = useRef(false);

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function handlePointerDown(event) {
    if (selectionMode) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    holdTriggeredRef.current = false;
    startPointRef.current = { x: event.clientX, y: event.clientY };

    holdTimerRef.current = window.setTimeout(() => {
      holdTriggeredRef.current = true;
      onHold?.(message.id, event.clientX, event.clientY);
    }, HOLD_MS);
  }

  function handlePointerMove(event) {
    if (!holdTimerRef.current) return;

    const dx = Math.abs(event.clientX - startPointRef.current.x);
    const dy = Math.abs(event.clientY - startPointRef.current.y);
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
      clearHoldTimer();
    }
  }

  function handlePointerUp() {
    clearHoldTimer();
  }

  function handleClick() {
    if (selectionMode) {
      onToggleSelect?.(message.id);
    }
  }

  return (
    <div
      className={`chat-message chat-message--${modifier}${isSelected ? ' chat-message--selected' : ''}${selectionMode ? ' chat-message--selectable' : ''}`}
    >
      {!isOwn && (
        <span className="chat-message__sender">{senderLabel}</span>
      )}

      <div
        className={`chat-message__bubble${isSelected ? ' chat-message__bubble--selected' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        role={selectionMode ? 'button' : undefined}
        tabIndex={selectionMode ? 0 : undefined}
        onKeyDown={selectionMode ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleSelect?.(message.id);
          }
        } : undefined}
        aria-pressed={selectionMode ? isSelected : undefined}
      >
        {messageText.split('\n').map((line, i, lines) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </div>

      <span className="chat-message__time">{formatMessageTime(message.created_at)}</span>
    </div>
  );
}
