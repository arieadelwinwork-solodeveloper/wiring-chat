export function formatMessageTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function formatChatDateLabel(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Hari ini';

  const today = startOfDay(new Date());
  const messageDay = startOfDay(date);
  const diffDays = Math.round((today - messageDay) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';

  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

export function groupMessagesByDate(messages) {
  if (!messages.length) return [];

  const groups = [];

  for (const message of messages) {
    const dateKey = startOfDay(new Date(message.created_at)).toISOString();
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.dateKey === dateKey) {
      lastGroup.messages.push(message);
    } else {
      groups.push({
        dateKey,
        dateLabel: formatChatDateLabel(message.created_at),
        messages: [message],
      });
    }
  }

  return groups;
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
