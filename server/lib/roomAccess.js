import { isMemoryMode } from './memoryStore.js';

export class AccessDeniedError extends Error {
  constructor(message = 'Akses ditolak') {
    super(message);
    this.name = 'AccessDeniedError';
    this.status = 403;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Data tidak ditemukan') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

async function getLinkedOwnerIds(supabase, userId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('owner_id')
    .eq('linked_user_id', userId);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.owner_id));
}

async function getMemberRoomIds(supabase, userId) {
  const { data, error } = await supabase
    .from('chat_room_members')
    .select('room_id')
    .eq('user_id', userId);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.room_id));
}

export function canAccessRoom(room, { userId, userRole, linkedOwnerIds, memberRoomIds }) {
  if (!room) return false;
  if (room.owner_id === userId) return true;
  if (room.subtype === 'standard' && room.tipe === 'internal') return true;
  if (memberRoomIds.has(room.id)) return true;

  if (room.subtype === 'contact') {
    return room.owner_id === userId;
  }

  if (room.subtype === 'bot_faq' || room.subtype === 'bot_ai') {
    if (userRole === 'owner') return room.owner_id === userId;
    return linkedOwnerIds.has(room.owner_id);
  }

  if (room.subtype === 'group') {
    return memberRoomIds.has(room.id);
  }

  return false;
}

export async function filterAccessibleRooms(rooms, userId, userRole, supabase) {
  if (userRole === 'owner') {
    return (rooms ?? []).filter(
      (room) => room.subtype !== 'bot_faq' && room.subtype !== 'bot_ai',
    );
  }

  const [linkedOwnerIds, memberRoomIds] = await Promise.all([
    getLinkedOwnerIds(supabase, userId),
    getMemberRoomIds(supabase, userId),
  ]);

  return (rooms ?? []).filter((room) => canAccessRoom(room, {
    userId,
    userRole,
    linkedOwnerIds,
    memberRoomIds,
  }));
}

export async function assertRoomAccess(supabase, roomId, userId, userRole) {
  if (isMemoryMode()) return null;

  const { data: room, error } = await supabase
    .from('chat_rooms')
    .select('id, owner_id, subtype, tipe, config')
    .eq('id', roomId)
    .maybeSingle();

  if (error) throw error;
  if (!room) throw new NotFoundError();

  const [linkedOwnerIds, memberRoomIds] = await Promise.all([
    getLinkedOwnerIds(supabase, userId),
    getMemberRoomIds(supabase, userId),
  ]);

  const allowed = canAccessRoom(room, {
    userId,
    userRole,
    linkedOwnerIds,
    memberRoomIds,
  });

  if (!allowed) throw new AccessDeniedError();
  return room;
}

export async function assertMessageDeleteAccess(supabase, roomId, messageId, userId) {
  if (isMemoryMode()) return;

  const { data: message, error } = await supabase
    .from('messages')
    .select('id, sender_id, room_id')
    .eq('id', messageId)
    .eq('room_id', roomId)
    .maybeSingle();

  if (error) throw error;
  if (!message) throw new NotFoundError();

  const { data: room } = await supabase
    .from('chat_rooms')
    .select('owner_id')
    .eq('id', roomId)
    .maybeSingle();

  const isSender = message.sender_id === userId;
  const isRoomOwner = room?.owner_id === userId;

  if (!isSender && !isRoomOwner) {
    throw new AccessDeniedError();
  }
}
