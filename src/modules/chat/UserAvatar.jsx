export default function UserAvatar({ user, className = '', imageClassName = '' }) {
  const displayName = user?.name?.trim() || 'Pengguna';

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`Foto profil ${displayName}`}
        className={`user-avatar user-avatar--image ${imageClassName || className}`}
      />
    );
  }

  return (
    <div
      className={`user-avatar user-avatar--initials ${className}`}
      style={{ background: user?.avatarColor ?? '#0a2540' }}
      role="img"
      aria-label={`Avatar ${displayName}`}
    >
      {user?.initials ?? '?'}
    </div>
  );
}
