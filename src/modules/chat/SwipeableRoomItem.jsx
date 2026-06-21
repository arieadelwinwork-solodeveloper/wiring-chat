import { useSwipeToDelete } from './useSwipeToDelete';
import { SwipeDeleteAction } from './SwipeDeleteAction';
import './SwipeDelete.css';
import './SwipeableRoomItem.css';

export default function SwipeableRoomItem({
  room,
  isActive,
  showAsBot,
  onSelect,
  onDelete,
}) {
  const {
    trackRef,
    offset,
    dragging,
    removing,
    revealDelete,
  } = useSwipeToDelete({
    itemId: room.id,
    onDelete,
    onTap: () => onSelect(room.id),
  });

  return (
    <li className={`chat-room-list__item${removing ? ' swipe-delete__row--removing' : ''}`}>
      <div
        ref={trackRef}
        className={`swipe-delete__track swipe-delete__track--room${dragging ? ' swipe-delete__track--dragging' : ''}`}
      >
        <SwipeDeleteAction visible={revealDelete} />

        <div
          className={`swipe-delete__content swipe-delete__content--room chat-room-item${showAsBot ? ' chat-room-item--bot' : ''}${isActive ? ' chat-room-item--active' : ''}${dragging ? ' swipe-delete__content--dragging' : ''}`}
          style={{ transform: `translateX(${offset}px)` }}
          role="button"
          tabIndex={0}
          aria-label={`Buka chat ${room.nama_room}`}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect(room.id);
            }
          }}
        >
          <div
            className={`chat-room-item__avatar${showAsBot ? ' chat-room-item__avatar--bot' : ''}`}
            style={{ background: room.avatar }}
          >
            {room.initials}
          </div>
          <div className="chat-room-item__info">
            {showAsBot ? (
              <div className="chat-room-item__name-row">
                <span className="chat-room-item__name">{room.nama_room}</span>
                <span className="chat-room-item__bot-badge">{room.statusLabel}</span>
              </div>
            ) : (
              <div className="chat-room-item__name">{room.nama_room}</div>
            )}
            <div className="chat-room-item__preview">{room.lastMessage}</div>
          </div>
          {room.lastTime && (
            <span className="chat-room-item__time">{room.lastTime}</span>
          )}
        </div>
      </div>
    </li>
  );
}
