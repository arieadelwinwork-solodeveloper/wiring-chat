const ID_CHARS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const STORAGE_KEY = 'wiring_nomor_id';

export function generateNomorId() {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return `USR-${suffix}`;
}

export function getOrCreateLocalNomorId() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const created = generateNomorId();
  localStorage.setItem(STORAGE_KEY, created);
  return created;
}
