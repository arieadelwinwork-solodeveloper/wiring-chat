export function formatMessageTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function getMessageSenderName(message, currentUserName, currentUserId = 'user-me') {
  if (message.sender_id === currentUserId) return currentUserName;
  return message.sender_name ?? 'Pengguna';
}

export function formatMessageForCopy(message, currentUserName, currentUserId = 'user-me') {
  const name = getMessageSenderName(message, currentUserName, currentUserId);
  const time = formatMessageTime(message.created_at);
  const text = message.teks_pesan.replace(/\n/g, ' ').trim();
  return `${name} / ${time} / ${text}`;
}

export function formatMessagesForCopy(messages, currentUserName, currentUserId = 'user-me') {
  return messages
    .map((message) => formatMessageForCopy(message, currentUserName, currentUserId))
    .join('\n');
}
