import { getSupabaseAdmin } from '../lib/supabase.js';
import { pickAvatarColor } from '../lib/formatters.js';
import { insertSystemMessage } from './roomService.js';
import {
  isMemoryMode,
  memoryListContacts,
  memoryCreateContact,
  memoryLookupUserByNomorId,
} from '../lib/memoryStore.js';

export async function lookupUserByNomorId(nomorId, requesterId) {
  const normalized = nomorId.trim().toUpperCase();

  if (isMemoryMode()) {
    return memoryLookupUserByNomorId(normalized, requesterId);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name, nomor_id, role')
    .eq('nomor_id', normalized)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.id === requesterId) return null;

  return {
    userId: data.id,
    nama: data.display_name,
    nomorId: data.nomor_id,
    role: data.role,
  };
}

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
  const linked = await lookupUserByNomorId(payload.nomor_id, ownerId);
  const nama = linked?.nama ?? payload.nama;
  const linkedUserId = linked?.userId ?? null;

  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .insert({
      nama_room: nama,
      tipe: 'internal',
      subtype: 'contact',
      owner_id: ownerId,
      avatar_color: pickAvatarColor(nama),
      config: {
        nomor_id: payload.nomor_id,
        contact_status: linked?.role ?? payload.status,
      },
    })
    .select()
    .single();

  if (roomError) throw roomError;

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .insert({
      owner_id: ownerId,
      nama,
      nomor_id: payload.nomor_id,
      status: linked?.role ?? payload.status,
      linked_user_id: linkedUserId,
      room_id: room.id,
    })
    .select()
    .single();

  if (contactError) throw contactError;

  await insertSystemMessage(
    room.id,
    `Kontak ${nama} (${payload.nomor_id}) ditambahkan.`,
  );

  return {
    id: contact.id,
    nama: contact.nama,
    nomorId: contact.nomor_id,
    status: contact.status,
    roomId: room.id,
    linkedUserId,
  };
}
