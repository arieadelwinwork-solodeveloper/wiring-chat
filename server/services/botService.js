import { getSupabaseAdmin } from '../lib/supabase.js';
import { pickAvatarColor } from '../lib/formatters.js';
import { insertSystemMessage } from './roomService.js';
import {
  isMemoryMode,
  memoryCreateFaqBot,
  memoryCreateAiAssistant,
} from '../lib/memoryStore.js';

function buildFaqWelcomeMessage(botName, categories) {
  const categoryList = categories
    .filter((item) => item.name?.trim())
    .map((item) => `• ${item.name}`)
    .join('\n');

  const intro = `Halo! Saya ${botName}. Pilih kategorisasi untuk memulai.`;
  return categoryList ? `${intro}\n\nKategorisasi:\n${categoryList}` : intro;
}

function buildAiWelcomeMessage(nama, llm, knowledgeFiles) {
  const fileNames = knowledgeFiles.map((file) => `• ${file.name}`).join('\n');
  return [
    `Halo! Saya ${nama}.`,
    `Saya berbasis ${llm} dengan knowledge base dari ${knowledgeFiles.length} file:`,
    fileNames,
    'Ada yang bisa saya bantu untuk tim Anda?',
  ].join('\n\n');
}

export async function createFaqBot(ownerId, payload) {
  if (isMemoryMode()) return memoryCreateFaqBot(ownerId, payload);

  const supabase = getSupabaseAdmin();

  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .insert({
      nama_room: payload.nama,
      tipe: 'internal',
      subtype: 'bot_faq',
      owner_id: ownerId,
      avatar_color: '#5ac8fa',
      config: { kode_id: payload.kode_id },
    })
    .select()
    .single();

  if (roomError) throw roomError;

  const { data: bot, error: botError } = await supabase
    .from('chat_bots')
    .insert({
      owner_id: ownerId,
      bot_type: 'faq',
      nama: payload.nama,
      kode_id: payload.kode_id,
      room_id: room.id,
      config: { categories: payload.categories },
    })
    .select()
    .single();

  if (botError) throw botError;

  if (payload.categories.length) {
    const categoryRows = payload.categories.map((cat, index) => ({
      id: cat.id.length === 36 ? cat.id : undefined,
      bot_id: bot.id,
      name: cat.name,
      sort_order: index,
    }));

    const { data: savedCategories, error: catError } = await supabase
      .from('faq_categories')
      .insert(categoryRows.map(({ id, ...rest }) => rest))
      .select();

    if (catError) throw catError;

    const categoryIdMap = {};
    payload.categories.forEach((cat, i) => {
      categoryIdMap[cat.id] = savedCategories[i]?.id;
    });

    const faqRows = payload.faqs
      .filter((faq) => faq.question.trim() && faq.answer.trim())
      .map((faq) => ({
        bot_id: bot.id,
        category_id: faq.categoryId ? categoryIdMap[faq.categoryId] : null,
        question: faq.question,
        answer: faq.answer,
      }));

    if (faqRows.length) {
      await supabase.from('faq_items').insert(faqRows);
    }
  }

  await insertSystemMessage(
    room.id,
    buildFaqWelcomeMessage(payload.nama, payload.categories),
    payload.nama,
  );

  return { bot, room };
}

export async function createAiAssistant(ownerId, payload) {
  if (isMemoryMode()) return memoryCreateAiAssistant(ownerId, payload);

  const supabase = getSupabaseAdmin();

  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .insert({
      nama_room: payload.nama,
      tipe: 'internal',
      subtype: 'bot_ai',
      owner_id: ownerId,
      avatar_color: pickAvatarColor(payload.nama),
      config: { llm: payload.llm },
    })
    .select()
    .single();

  if (roomError) throw roomError;

  const { data: bot, error: botError } = await supabase
    .from('chat_bots')
    .insert({
      owner_id: ownerId,
      bot_type: 'ai_assistant',
      nama: payload.nama,
      llm: payload.llm,
      room_id: room.id,
      config: { knowledge_files: payload.knowledge_files },
    })
    .select()
    .single();

  if (botError) throw botError;

  const files = payload.knowledge_files.map((file) => ({
    bot_id: bot.id,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
  }));

  await supabase.from('knowledge_files').insert(files);

  await insertSystemMessage(
    room.id,
    buildAiWelcomeMessage(payload.nama, payload.llm, payload.knowledge_files),
    payload.nama,
  );

  return { bot, room };
}

export async function listOwnerBots(ownerId) {
  if (isMemoryMode()) {
    const { ownerBots } = (await import('../lib/memoryStore.js')).memoryListSidebar(ownerId, 'owner');
    return ownerBots;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('chat_bots')
    .select('*, chat_rooms(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getFaqResponse(botId, userMessage) {
  if (isMemoryMode()) {
    return `Terima kasih atas pertanyaan Anda. Bot FAQ siap membantu seputar: ${userMessage.slice(0, 80)}`;
  }

  const supabase = getSupabaseAdmin();
  const { data: items } = await supabase
    .from('faq_items')
    .select('question, answer, faq_categories(name)')
    .eq('bot_id', botId);

  const normalized = userMessage.toLowerCase();
  const match = (items ?? []).find((item) =>
    normalized.includes(item.question.toLowerCase().slice(0, 20))
    || item.question.toLowerCase().includes(normalized.slice(0, 20)),
  );

  if (match) return match.answer;

  const categories = [...new Set((items ?? []).map((i) => i.faq_categories?.name).filter(Boolean))];
  return categories.length
    ? `Silakan pilih kategori:\n${categories.map((c) => `• ${c}`).join('\n')}`
    : 'Belum ada FAQ yang dikonfigurasi.';
}
