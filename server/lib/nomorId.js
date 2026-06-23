const ID_CHARS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateNomorId() {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return `USR-${suffix}`;
}
