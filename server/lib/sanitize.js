/** Sanitasi plain text di backend (defense in depth, PRD §3.2). */
export function sanitizePlainText(input, maxLength = 10000) {
  const text = String(input ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();

  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}
