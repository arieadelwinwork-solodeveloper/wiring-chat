import { randomUUID } from 'crypto';
import { getInitials, pickAvatarColor, messageToClient } from './formatters.js';

const store = {
  profiles: new Map(),
  rooms: new Map(),
  messages: new Map(),
  contacts: new Map(),
  bots: new Map(),
};

export const DEV_USER = '00000000-0000-0000-0000-000000000001';

function ensureDevProfile() {
  if (!store.profiles.has(DEV_USER)) {
    store.profiles.set(DEV_USER, {
      id: DEV_USER,
      display_name: 'Dev User',
      avatar_color: '#0a2540',
      role: 'owner',
      nomor_id: null,
    });
  }
}

export function isMemoryMode() {
  return !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY;
}

export function memoryGetProfile(userId) {
  ensureDevProfile();
  return store.profiles.get(userId) ?? store.profiles.get(DEV_USER);
}

export function memoryUpdateProfile(userId, updates) {
  ensureDevProfile();
  const current = memoryGetProfile(userId);
  const next = { ...current, ...updates, id: userId };
  store.profiles.set(userId, next);
  return next;
}

export function memoryListContacts(ownerId) {
  ensureDevProfile();
  return [...store.contacts.values()]
    .filter((c) => c.owner_id === ownerId)
    .map((c) => ({
      id: c.id,
      nama: c.nama,
      nomorId: c.nomor_id,
      status: c.status,
      roomId: c.room_id,
    }));
}

export function memoryCreateContact(ownerId, payload) {
  ensureDevProfile();
  const id = randomUUID();
  const roomId = randomUUID();

  store.rooms.set(roomId, {
    id: roomId,
    nama_room: payload.nama,
    tipe: 'internal',
    subtype: 'contact',
    owner_id: ownerId,
    avatar_color: pickAvatarColor(payload.nama),
    config: { nomor_id: payload.nomor_id, contact_status: payload.status },
    updated_at: new Date().toISOString(),
  });

  store.contacts.set(id, {
    id,
    owner_id: ownerId,
    nama: payload.nama,
    nomor_id: payload.nomor_id,
    status: payload.status,
    room_id: roomId,
  });

  store.messages.set(roomId, [{
    id: randomUUID(),
    room_id: roomId,
    sender_id: null,
    sender_role: 'ai',
    sender_name: 'Sistem',
    teks_pesan: `Kontak ${payload.nama} (${payload.nomor_id}) ditambahkan.`,
    created_at: new Date().toISOString(),
  }]);

  return { id, nama: payload.nama, nomorId: payload.nomor_id, status: payload.status, roomId };
}

export function memoryListSidebar(userId, userRole) {
  ensureDevProfile();
  const rooms = [...store.rooms.values()].map((room) => {
    const msgs = store.messages.get(room.id) ?? [];
    const last = msgs[msgs.length - 1];
    const item = {
      id: room.id,
      nama_room: room.nama_room,
      tipe: room.tipe,
      avatar: room.avatar_color ?? pickAvatarColor(room.id),
      initials: getInitials(room.nama_room),
      lastMessage: last?.teks_pesan?.slice(0, 80) ?? '',
      lastTime: '10:32',
      isGroup: room.subtype === 'group',
      isContact: room.subtype === 'contact',
      isBot: room.subtype === 'bot_faq' || room.subtype === 'bot_ai',
    };
    if (room.subtype === 'group') {
      item.aiEnabled = Boolean(room.config?.ai_enabled);
      item.groupConfig = {
        ...room.config,
        memberIds: room.config?.member_ids ?? [],
        aiEnabled: Boolean(room.config?.ai_enabled),
        responseMode: room.config?.response_mode,
        triggerCode: room.config?.trigger_code,
        intervalMinutes: room.config?.interval_minutes,
      };
    }
    if (room.subtype === 'contact') {
      item.contactStatus = room.config?.contact_status;
    }
    if (room.subtype === 'bot_faq' || room.subtype === 'bot_ai') {
      item.statusLabel = room.subtype === 'bot_faq' ? 'Bot' : 'AI';
      item.botType = room.subtype === 'bot_faq' ? 'faq' : 'ai';
    }
    return item;
  }).filter((r) => !(userRole === 'owner' && r.isBot));

  const ownerBots = userRole === 'owner'
    ? [...store.bots.values()].map((bot) => ({
      id: bot.room_id,
      nama_room: bot.nama,
      isBot: true,
      statusLabel: bot.bot_type === 'faq' ? 'Bot' : 'AI',
      avatar: bot.bot_type === 'faq' ? '#5ac8fa' : '#0a2540',
      initials: bot.bot_type === 'faq' ? 'FAQ' : getInitials(bot.nama),
      lastMessage: bot.kode_id ? `Kode: ${bot.kode_id}` : 'Siap digunakan',
      lastTime: 'Baru',
      botType: bot.bot_type === 'faq' ? 'faq' : 'ai',
    }))
    : [...store.bots.values()].map((bot) => ({
      id: bot.room_id,
      nama_room: bot.nama,
      isBot: true,
      avatar: bot.bot_type === 'faq' ? '#5ac8fa' : '#0a2540',
      initials: bot.bot_type === 'faq' ? 'FAQ' : getInitials(bot.nama),
      lastMessage: bot.kode_id ? `Kode: ${bot.kode_id}` : 'Siap digunakan',
      lastTime: 'Baru',
      botType: bot.bot_type === 'faq' ? 'faq' : 'ai',
    }));

  return {
    rooms: userRole === 'owner' ? rooms : [...rooms, ...ownerBots.filter((b) => !rooms.find((r) => r.id === b.id))],
    ownerBots: userRole === 'owner' ? ownerBots : [],
  };
}

export function memoryGetMessages(roomId, userId) {
  ensureDevProfile();
  return (store.messages.get(roomId) ?? []).map((m) => messageToClient(m, userId));
}

export function memorySendMessage(roomId, userId, displayName, text) {
  ensureDevProfile();
  const msg = {
    id: randomUUID(),
    room_id: roomId,
    sender_id: userId,
    sender_role: 'staff',
    sender_name: displayName,
    teks_pesan: text,
    created_at: new Date().toISOString(),
  };
  const list = store.messages.get(roomId) ?? [];
  list.push(msg);
  store.messages.set(roomId, list);
  return messageToClient(msg, userId);
}

export function memoryInsertSystemMessage(roomId, text, senderName = 'Sistem') {
  ensureDevProfile();
  const msg = {
    id: randomUUID(),
    room_id: roomId,
    sender_id: null,
    sender_role: 'ai',
    sender_name: senderName,
    teks_pesan: text,
    created_at: new Date().toISOString(),
  };
  const list = store.messages.get(roomId) ?? [];
  list.push(msg);
  store.messages.set(roomId, list);
  return msg;
}

export function memoryDeleteMessage(roomId, messageId) {
  ensureDevProfile();
  const list = store.messages.get(roomId) ?? [];
  const next = list.filter((msg) => msg.id !== messageId);
  store.messages.set(roomId, next);
  return { ok: true };
}

export function memoryCreateGroup(ownerId, payload, memberNameMap) {
  ensureDevProfile();
  const roomId = randomUUID();
  const config = {
    member_ids: payload.member_ids,
    ai_enabled: payload.ai_enabled,
    llm: payload.llm,
    tasks: payload.tasks ?? [],
    response_mode: payload.response_mode ?? 'always',
    trigger_code: payload.trigger_code,
    interval_minutes: payload.interval_minutes,
  };

  store.rooms.set(roomId, {
    id: roomId,
    nama_room: payload.nama,
    tipe: 'internal',
    subtype: 'group',
    owner_id: ownerId,
    avatar_color: '#5856d6',
    config,
    updated_at: new Date().toISOString(),
  });

  const memberNames = payload.member_ids.map((id) => memberNameMap[id]).filter(Boolean);
  const welcome = [
    `Selamat datang di grup "${payload.nama}".`,
    `Anggota: ${memberNames.join(', ')}`,
  ].join('\n');

  memoryInsertSystemMessage(roomId, welcome, payload.ai_enabled ? 'AI Grup' : 'Sistem');
  store.messages.set(roomId, store.messages.get(roomId) ?? []);

  return { id: roomId, nama: payload.nama, ...config };
}

export function memoryCreateFaqBot(ownerId, payload) {
  ensureDevProfile();
  const roomId = randomUUID();
  const botId = randomUUID();

  store.rooms.set(roomId, {
    id: roomId,
    nama_room: payload.nama,
    subtype: 'bot_faq',
    tipe: 'internal',
    owner_id: ownerId,
    avatar_color: '#5ac8fa',
    config: { kode_id: payload.kode_id },
    updated_at: new Date().toISOString(),
  });

  store.bots.set(botId, {
    id: botId,
    owner_id: ownerId,
    bot_type: 'faq',
    nama: payload.nama,
    kode_id: payload.kode_id,
    room_id: roomId,
  });

  const cats = payload.categories.filter((c) => c.name.trim()).map((c) => `• ${c.name}`).join('\n');
  const welcome = cats
    ? `Halo! Saya ${payload.nama}. Pilih kategorisasi untuk memulai.\n\nKategorisasi:\n${cats}`
    : `Halo! Saya ${payload.nama}. Pilih kategorisasi untuk memulai.`;

  memoryInsertSystemMessage(roomId, welcome, payload.nama);
  return { bot: store.bots.get(botId), room: store.rooms.get(roomId) };
}

export function memoryCreateAiAssistant(ownerId, payload) {
  ensureDevProfile();
  const roomId = randomUUID();
  const botId = randomUUID();

  store.rooms.set(roomId, {
    id: roomId,
    nama_room: payload.nama,
    subtype: 'bot_ai',
    tipe: 'internal',
    owner_id: ownerId,
    avatar_color: pickAvatarColor(payload.nama),
    config: { llm: payload.llm },
    updated_at: new Date().toISOString(),
  });

  store.bots.set(botId, {
    id: botId,
    owner_id: ownerId,
    bot_type: 'ai_assistant',
    nama: payload.nama,
    llm: payload.llm,
    room_id: roomId,
  });

  const files = payload.knowledge_files.map((f) => `• ${f.name}`).join('\n');
  memoryInsertSystemMessage(
    roomId,
    `Halo! Saya ${payload.nama}.\n\nSaya berbasis ${payload.llm} dengan knowledge base:\n${files}`,
    payload.nama,
  );

  return { bot: store.bots.get(botId), room: store.rooms.get(roomId) };
}

export function memoryGetRoom(roomId) {
  ensureDevProfile();
  return store.rooms.get(roomId);
}

export function memoryGetBotByRoom(roomId) {
  ensureDevProfile();
  return [...store.bots.values()].find((b) => b.room_id === roomId);
}
