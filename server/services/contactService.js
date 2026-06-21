import { getSupabaseAdmin } from '../lib/supabase.js';
import { pickAvatarColor } from '../lib/formatters.js';
import { insertSystemMessage } from './roomService.js';
import {
  isMemoryMode,
  memoryListContacts,
  memoryCreateContact,
} from '../lib/memoryStore.js';

export async function listContacts(ownerId) {
  if (isMemoryMode()) return memoryListContacts(ownerId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    nama: row.nama,
    nomorId: row.nomor_id,
    status: row.status,
    roomId: row.room_id,
  }));
}

export async function listInvitableMembers(ownerId) {
  const contacts = await listContacts(ownerId);
  return contacts.map((c) => ({
    id: c.id,
    nama: c.nama,
    subtitle: `${c.nomorId} · ${c.status}`,
  }));
}

export async function createContact(ownerId, payload) {
  if (isMemoryMode()) return memoryCreateContact(ownerId, payload);

  const supabase = getSupabaseAdmin();

  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .insert({
      nama_room: payload.nama,
      tipe: 'internal',
      subtype: 'contact',
      owner_id: ownerId,
      avatar_color: pickAvatarColor(payload.nama),
      config: {
        nomor_id: payload.nomor_id,
        contact_status: payload.status,
      },
    })
    .select()
    .single();

  if (roomError) throw roomError;

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .insert({
      owner_id: ownerId,
      nama: payload.nama,
      nomor_id: payload.nomor_id,
      status: payload.status,
      room_id: room.id,
    })
    .select()
    .single();

  if (contactError) throw contactError;

  await insertSystemMessage(
    room.id,
    `Kontak ${payload.nama} (${payload.nomor_id}) ditambahkan.`,
  );

  return {
    id: contact.id,
    nama: contact.nama,
    nomorId: contact.nomor_id,
    status: contact.status,
    roomId: room.id,
  };
}
