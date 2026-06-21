import { Router } from 'express';
import { handleDatabaseError } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireOwner } from '../middleware/auth.js';
import {
  createFaqBotSchema,
  createAiAssistantSchema,
} from '../schemas/index.js';
import {
  createFaqBot,
  createAiAssistant,
  listOwnerBots,
} from '../services/botService.js';
import { roomToSidebarItem } from '../lib/formatters.js';

const router = Router();

router.get('/', requireOwner, async (req, res) => {
  try {
    const bots = await listOwnerBots(req.user.id);
    const items = bots.map((bot) => {
      const room = bot.chat_rooms;
      return roomToSidebarItem(
        room ?? { id: bot.room_id, nama_room: bot.nama, subtype: bot.bot_type === 'faq' ? 'bot_faq' : 'bot_ai', config: {} },
        null,
        'owner',
      );
    });
    res.json({ bots: items });
  } catch (err) {
    console.error('[BOTS LIST]', err);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

router.post('/faq', requireOwner, validate(createFaqBotSchema), async (req, res) => {
  try {
    const result = await createFaqBot(req.user.id, {
      nama: req.validatedData.nama,
      kode_id: req.validatedData.kode_id,
      categories: req.validatedData.categories,
      faqs: req.validatedData.faqs,
    });
    res.status(201).json({
      bot: {
        generated: true,
        label: 'Bot FAQ',
        nama: result.bot.nama,
        kodeId: result.bot.kode_id,
        roomId: result.room.id,
      },
    });
  } catch (err) {
    console.error('[FAQ BOT]', err);
    if (err.code) return handleDatabaseError(err, res);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

router.post('/ai-assistant', requireOwner, validate(createAiAssistantSchema), async (req, res) => {
  try {
    const result = await createAiAssistant(req.user.id, req.validatedData);
    res.status(201).json({
      bot: {
        generated: true,
        label: 'AI Assistant',
        nama: result.bot.nama,
        llm: result.bot.llm,
        knowledgeFiles: req.validatedData.knowledge_files,
        roomId: result.room.id,
      },
    });
  } catch (err) {
    console.error('[AI ASSISTANT]', err);
    if (err.code) return handleDatabaseError(err, res);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

export default router;
