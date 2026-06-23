const AVATAR_COLORS = ['#0a2540', '#5856d6', '#007aff', '#34c759', '#ff9500', '#ff2d55'];

export function getInitials(name) {
  return String(name)
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) {
    return date.toLocaleDateString('id-ID', { weekday: 'short' });
  }
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

export function pickAvatarColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function mapContactStatusLabel(status) {
  const labels = {
    owner: 'Owner',
    user: 'User',
    bot: 'Bot',
    ai_assistant: 'AI Assistant',
  };
  return labels[status] ?? status;
}

export function roomToSidebarItem(room, lastMessage, userRole) {
  const avatar = room.avatar_color || pickAvatarColor(room.id);
  const base = {
    id: room.id,
    nama_room: room.nama_room,
    tipe: room.tipe,
    avatar,
    initials: getInitials(room.nama_room),
    lastMessage: lastMessage?.teks_pesan?.slice(0, 80) ?? '',
    lastTime: lastMessage ? formatRelativeTime(lastMessage.created_at) : '',
  };

  if (room.subtype === 'group') {
    const config = room.config ?? {};
    const memberCount = config.member_ids?.length ?? 0;
    return {
      ...base,
      isGroup: true,
      aiEnabled: Boolean(config.ai_enabled),
      groupConfig: {
        memberIds: config.member_ids ?? [],
        aiEnabled: Boolean(config.ai_enabled),
        llm: config.llm,
        tasks: config.tasks ?? [],
        responseMode: config.response_mode,
        triggerCode: config.trigger_code,
        intervalMinutes: config.interval_minutes,
      },
      lastMessage: lastMessage?.teks_pesan?.slice(0, 80)
        ?? (config.ai_enabled
          ? `${memberCount} anggota · AI`
          : `${memberCount} anggota`),
    };
  }

  if (room.subtype === 'contact') {
    const config = room.config ?? {};
    return {
      ...base,
      isContact: true,
      nomorId: config.nomor_id ?? null,
      contactStatus: config.contact_status ?? 'user',
      lastMessage: lastMessage?.teks_pesan?.slice(0, 80)
        ?? `${config.nomor_id ?? ''} · ${mapContactStatusLabel(config.contact_status)}`,
    };
  }

  if (room.subtype === 'bot_faq' || room.subtype === 'bot_ai') {
    const isOwner = userRole === 'owner';
    return {
      ...base,
      isBot: true,
      botType: room.subtype === 'bot_faq' ? 'faq' : 'ai',
      statusLabel: room.subtype === 'bot_faq' ? 'Bot' : 'AI',
      lastMessage: lastMessage?.teks_pesan?.slice(0, 80) ?? room.config?.preview ?? 'Siap digunakan',
      lastTime: lastMessage ? formatRelativeTime(lastMessage.created_at) : 'Baru',
      hideFromOwnerList: !isOwner,
    };
  }

  return base;
}

export function messageToClient(row, currentUserId) {
  return {
    id: row.id,
    sender_id: row.sender_id === currentUserId ? 'user-me' : row.sender_id,
    sender_role: row.sender_role,
    sender_name: row.sender_name ?? 'Pengguna',
    teks_pesan: row.teks_pesan,
    created_at: row.created_at,
  };
}
