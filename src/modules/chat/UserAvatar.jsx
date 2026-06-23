export default function UserAvatar({ user, className = '', imageClassName = '' }) {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className={`user-avatar user-avatar--image ${imageClassName || className}`}
      />
    );
  }

  return (
    <div
      className={`user-avatar user-avatar--initials ${className}`}
      style={{ background: user?.avatarColor ?? '#0a2540' }}
      aria-hidden
    >
      {user?.initials ?? '?'}
    </div>
  );
}
