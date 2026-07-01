import DOMPurify from 'dompurify';

/** Strip HTML — aman untuk teks user-generated (PRD §3.2). */
export function sanitizeText(value) {
  if (value == null) return '';
  return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
