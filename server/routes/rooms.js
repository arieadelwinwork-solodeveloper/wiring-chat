import { Router } from 'express';
import { handleDatabaseError } from '../lib/errors.js';
import { validate, validateParams } from '../middleware/validate.js';
import { sendMessageSchema, roomIdParamSchema, roomMessageParamsSchema } from '../schemas/index.js';
import { filterPromptInjection } from '../middleware/promptInjection.js';
import {
  listSidebarRooms,
  getRoomMessages,
  sendMessage,
  deleteMessage,
} from '../services/roomService.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { summarizeUnansweredMessages } from '../services/aiService.js';
import { insertSystemMessage } from '../services/roomService.js';
import { getFaqResponse } from '../services/botService.js';
import { isMemoryMode, memoryGetRoom, memoryGetBotByRoom } from '../lib/memoryStore.js';
import { AccessDeniedError, NotFoundError } from '../lib/roomAccess.js';

const router = Router();

function handleRouteError(err, res) {
  if (err instanceof AccessDeniedError) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: 'Data tidak ditemukan' });
  }
  if (err.code) return handleDatabaseError(err, res);
  return res.status(500).json({ error: 'Terjadi kesalahan sistem' });
}

router.get('/', async (req, res) => {
  try {
    const result = await listSidebarRooms(req.user.id, req.user.role);
    res.json(result);
  } catch (err) {
    console.error('[ROOMS LIST]', err);
    handleRouteError(err, res);
  }
});

router.get('/:roomId/messages', validateParams(roomIdParamSchema), async (req, res) => {
  try {
    const { roomId } = req.validatedParams;
    const messages = await getRoomMessages(roomId, req.user.id, req.user.role);
    res.json({ messages });
  } catch (err) {
    console.error('[MESSAGES LIST]', err);
    handleRouteError(err, res);
  }
});

router.post(
  '/:roomId/messages',
  validateParams(roomIdParamSchema),
  validate(sendMessageSchema),
  filterPromptInjection,
  async (req, res) => {
    try {
      const { roomId } = req.validatedParams;
      const message = await sendMessage(
        roomId,
        req.user.id,
        req.user.displayName ?? 'Pengguna',
        req.validatedData.teks_pesan,
        req.user.role,
      );

      const supabase = getSupabaseAdmin();
      let room = null;

      if (isMemoryMode()) {
        room = memoryGetRoom(roomId);
      } else if (supabase) {
        const { data } = await supabase
          .from('chat_rooms')
          .select('subtype, config')
          .eq('id', roomId)
          .maybeSingle();
        room = data;
      }

      if (room?.subtype === 'bot_faq') {
        let bot = null;
        if (isMemoryMode()) {
          bot = memoryGetBotByRoom(roomId);
        } else if (supabase) {
          const { data } = await supabase
            .from('chat_bots')
            .select('id, nama')
            .eq('room_id', roomId)
            .maybeSingle();
          bot = data;
        }

        if (bot) {
          const reply = await getFaqResponse(bot.id, req.validatedData.teks_pesan);
          await insertSystemMessage(roomId, reply, bot.nama);
        }
      }

      if (room?.subtype === 'group' && room.config?.ai_enabled) {
        const mode = room.config.response_mode;
        const text = req.validatedData.teks_pesan;
        let shouldRespond = mode === 'always';

        if (mode === 'on_code' && room.config.trigger_code) {
          shouldRespond = text.includes(room.config.trigger_code);
        }

        if (shouldRespond) {
          const allMessages = await getRoomMessages(roomId, req.user.id, req.user.role);
          const summary = await summarizeUnansweredMessages(allMessages, room.config);
          await insertSystemMessage(roomId, summary, 'AI Grup');
        }
      }

      res.status(201).json({ message });
    } catch (err) {
      console.error('[MESSAGE SEND]', err);
      handleRouteError(err, res);
    }
  },
);

router.delete(
  '/:roomId/messages/:messageId',
  validateParams(roomMessageParamsSchema),
  async (req, res) => {
    try {
      const { roomId, messageId } = req.validatedParams;
      await deleteMessage(roomId, messageId, req.user.id, req.user.role);
      res.json({ ok: true });
    } catch (err) {
      console.error('[MESSAGE DELETE]', err);
      handleRouteError(err, res);
    }
  },
);

export default router;
