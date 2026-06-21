export function SwipeDeleteIcon() {
  return (
    <svg
      className="swipe-delete__icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

export function SwipeDeleteAction({ visible }) {
  return (
    <div
      className={`swipe-delete__action${visible ? ' swipe-delete__action--visible' : ''}`}
      aria-hidden
    >
      <SwipeDeleteIcon />
      <span>Hapus</span>
    </div>
  );
}
