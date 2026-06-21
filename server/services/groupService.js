import { getSupabaseAdmin } from '../lib/supabase.js';
import { pickAvatarColor } from '../lib/formatters.js';
import { insertSystemMessage } from './roomService.js';
import { isMemoryMode, memoryCreateGroup } from '../lib/memoryStore.js';

function buildGroupWelcomeMessage(group, memberNames) {
  const lines = [
    `Selamat datang di grup "${group.nama}".`,
    `Anggota: ${memberNames.join(', ')}`,
  ];

  if (group.ai_enabled) {
    lines.push(
      '',
      'AI Grup aktif dengan konfigurasi:',
      `• LLM: ${group.llm}`,
      `• Tugas: ${(group.tasks ?? []).join(', ')}`,
      `• Waktu respon: ${group.response_mode}`,
      '',
      'AI akan merangkum pesan yang belum dibalas dari riwayat chat maksimal 1 hari. Pesan basa-basi, candaan, atau yang tidak berkaitan dengan knowledge base akan diabaikan.',
    );
  }

  return lines.join('\n');
}

export async function createGroup(ownerId, payload, memberNameMap) {
  if (isMemoryMode()) return memoryCreateGroup(ownerId, payload, memberNameMap);

  const supabase = getSupabaseAdmin();

  const config = {
    member_ids: payload.member_ids,
    ai_enabled: payload.ai_enabled,
    llm: payload.llm ?? null,
    tasks: payload.tasks ?? [],
    response_mode: payload.response_mode ?? 'always',
    trigger_code: payload.trigger_code ?? null,
    interval_minutes: payload.interval_minutes ?? null,
  };

  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .insert({
      nama_room: payload.nama,
      tipe: 'internal',
      subtype: 'group',
      owner_id: ownerId,
      avatar_color: '#5856d6',
      config,
    })
    .select()
    .single();

  if (roomError) throw roomError;

  const memberRows = payload.member_ids.map((contactId) => ({
    room_id: room.id,
    contact_id: contactId,
  }));

  memberRows.push({ room_id: room.id, user_id: ownerId });

  const { error: membersError } = await supabase
    .from('chat_room_members')
    .insert(memberRows);

  if (membersError) throw membersError;

  if (payload.ai_enabled && payload.knowledge_files?.length) {
    const files = payload.knowledge_files.map((file) => ({
      room_id: room.id,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    }));
    await supabase.from('knowledge_files').insert(files);
  }

  const memberNames = payload.member_ids
    .map((id) => memberNameMap[id])
    .filter(Boolean);

  await insertSystemMessage(
    room.id,
    buildGroupWelcomeMessage({ ...payload, nama: payload.nama }, memberNames),
    payload.ai_enabled ? 'AI Grup' : 'Sistem',
  );

  return {
    id: room.id,
    nama: room.nama_room,
    ...config,
  };
}
