import './ChatSkeleton.css';

function SkeletonBar({ className = '' }) {
  return <span className={`chat-skeleton ${className}`.trim()} />;
}

export function RoomListSkeleton({ count = 6 }) {
  return (
    <ul className="chat-room-list chat-skeleton-list" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="chat-skeleton-room">
          <SkeletonBar className="chat-skeleton--avatar" />
          <div className="chat-skeleton-room__lines">
            <SkeletonBar className="chat-skeleton--line chat-skeleton--line-title" />
            <SkeletonBar className="chat-skeleton--line chat-skeleton--line-preview" />
          </div>
          <SkeletonBar className="chat-skeleton--line chat-skeleton--line-time" />
        </li>
      ))}
    </ul>
  );
}

export function MessageListSkeleton({ count = 5 }) {
  return (
    <div className="chat-skeleton-messages" aria-busy="true" aria-label="Memuat pesan...">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`chat-skeleton-message chat-skeleton-message--${index % 2 === 0 ? 'other' : 'own'}`}
        >
          <SkeletonBar className="chat-skeleton--bubble" />
        </div>
      ))}
    </div>
  );
}
