import { getSupabaseAdmin } from '../lib/supabase.js';
import { handleDatabaseError } from '../lib/errors.js';
import { roomToSidebarItem, messageToClient, getInitials, pickAvatarColor } from '../lib/formatters.js';
import {
  isMemoryMode,
  memoryListSidebar,
  memoryGetMessages,
  memorySendMessage,
  memoryInsertSystemMessage,
  memoryDeleteMessage,
} from '../lib/memoryStore.js';
import {
  assertMessageDeleteAccess,
  assertRoomAccess,
  filterAccessibleRooms,
} from '../lib/roomAccess.js';

async function getLastMessages(supabase, roomIds) {
  if (!roomIds.length) return {};

  const { data, error } = await supabase
    .from('messages')
    .select('room_id, teks_pesan, created_at')
    .in('room_id', roomIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const map = {};
  for (const row of data ?? []) {
    if (!map[row.room_id]) map[row.room_id] = row;
  }
  return map;
}

export async function listSidebarRooms(userId, userRole) {
  if (isMemoryMode()) return memoryListSidebar(userId, userRole);

  const supabase = getSupabaseAdmin();

  const { data: rooms, error } = await supabase
    .from('chat_rooms')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const filtered = await filterAccessibleRooms(rooms, userId, userRole, supabase);

  const roomIds = filtered.map((r) => r.id);
  const lastMap = await getLastMessages(supabase, roomIds);

  const items = filtered
    .map((room) => roomToSidebarItem(room, lastMap[room.id], userRole))
    .filter((item) => !(userRole === 'owner' && item.isBot));

  const { data: bots } = await supabase
    .from('chat_bots')
    .select('*, chat_rooms(*)')
    .eq('owner_id', userId);

  const ownerBots = (bots ?? []).map((bot) => {
    const room = bot.chat_rooms ?? {};
    return roomToSidebarItem(
      { ...room, config: { ...room.config, preview: bot.kode_id ? `Kode: ${bot.kode_id}` : 'Siap digunakan' } },
      lastMap[bot.room_id],
      'owner',
    );
  });

  return { rooms: items, ownerBots };
}

export async function getRoomMessages(roomId, userId, userRole = 'user') {
  if (isMemoryMode()) return memoryGetMessages(roomId, userId);

  const supabase = getSupabaseAdmin();
  await assertRoomAccess(supabase, roomId, userId, userRole);

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => messageToClient(row, userId));
}

export async function sendMessage(roomId, userId, displayName, teksPesan, userRole = 'user') {
  if (isMemoryMode()) return memorySendMessage(roomId, userId, displayName, teksPesan);

  const supabase = getSupabaseAdmin();
  await assertRoomAccess(supabase, roomId, userId, userRole);

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      sender_id: userId,
      sender_role: 'staff',
      sender_name: displayName,
      teks_pesan: teksPesan,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('chat_rooms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', roomId);

  return messageToClient(data, userId);
}

export async function deleteMessage(roomId, messageId, userId, userRole = 'user') {
  if (isMemoryMode()) return memoryDeleteMessage(roomId, messageId);

  const supabase = getSupabaseAdmin();
  await assertRoomAccess(supabase, roomId, userId, userRole);
  await assertMessageDeleteAccess(supabase, roomId, messageId, userId);

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('room_id', roomId);

  if (error) throw error;

  await supabase
    .from('chat_rooms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', roomId);

  return { ok: true };
}

export async function insertSystemMessage(roomId, teksPesan, senderName = 'Sistem') {
  if (isMemoryMode()) return memoryInsertSystemMessage(roomId, teksPesan, senderName);

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      sender_id: null,
      sender_role: 'ai',
      sender_name: senderName,
      teks_pesan: teksPesan,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export { handleDatabaseError };
