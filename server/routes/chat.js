import { Router } from 'express';
import { validate, validateParams } from '../middleware/validate.js';
import { filterPromptInjection } from '../middleware/promptInjection.js';
import { aiChatSchema } from '../schemas/index.js';
import { generateAiReply } from '../services/aiService.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { insertSystemMessage } from '../services/roomService.js';
import { assertRoomAccess } from '../lib/roomAccess.js';
import { isMemoryMode } from '../lib/memoryStore.js';

const router = Router();

router.post('/', validate(aiChatSchema), filterPromptInjection, async (req, res) => {
  try {
    const { message, room_id: roomId } = req.validatedData;
    let llm = 'deepseek-chat';

    if (roomId) {
      if (!isMemoryMode()) {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
          return res.status(503).json({ error: 'Terjadi kesalahan sistem' });
        }

        await assertRoomAccess(supabase, roomId, req.user.id, req.user.role);

        const { data: bot } = await supabase
          .from('chat_bots')
          .select('llm, nama')
          .eq('room_id', roomId)
          .maybeSingle();

        if (bot?.llm) llm = bot.llm;

        const reply = await generateAiReply({ message, llm });
        await insertSystemMessage(roomId, reply, bot?.nama ?? 'AI Assistant');

        return res.json({ reply });
      }
    }

    const reply = await generateAiReply({ message, llm });
    res.json({ reply });
  } catch (err) {
    console.error('[AI CHAT]', err);
    if (err.status === 403) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    if (err.status === 404) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

export default router;
