import { z } from 'zod';
import { AVAILABLE_LLM_VALUES } from '../config/llm.js';
import { sanitizePlainText } from '../lib/sanitize.js';

const plainText = (max) => z
  .string()
  .max(max)
  .transform((value) => sanitizePlainText(value, max))
  .refine((value) => value.length >= 1, { message: 'Tidak boleh kosong' });

const availableLlmSchema = z.string().refine(
  (val) => AVAILABLE_LLM_VALUES.includes(val),
  { message: 'Model LLM belum tersedia atau tidak valid' },
);

export const updateProfileSchema = z.object({
  display_name: z.string().max(100).optional()
    .transform((value) => {
      if (value == null) return undefined;
      const cleaned = sanitizePlainText(value, 100);
      return cleaned || undefined;
    }),
  avatar_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  avatar_url: z.union([z.string().url(), z.literal('')]).nullable().optional(),
});

export const uploadAvatarSchema = z.object({
  image_data: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp|gif);base64,/, 'Format gambar tidak valid'),
});

export const nomorIdLookupParamSchema = z.object({
  nomorId: z.string().min(1).max(50).regex(/^USR-[0-9A-Z]+$/i),
});

export const createContactSchema = z.object({
  nama: plainText(200),
  nomor_id: z.string().min(1).max(50),
  status: z.enum(['owner', 'user', 'bot', 'ai_assistant']).default('user'),
});

const knowledgeFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['word', 'excel']),
  size: z.number().nonnegative(),
});

export const createGroupSchema = z.object({
  nama: plainText(200),
  member_ids: z.array(z.string().min(1)).min(1),
  ai_enabled: z.boolean().default(false),
  llm: z.string().optional(),
  knowledge_files: z.array(knowledgeFileSchema).optional(),
  tasks: z.array(z.enum(['reminder', 'virtual_manager'])).optional(),
  response_mode: z.enum(['always', 'on_code', 'interval']).optional(),
  trigger_code: z.string().max(100).optional(),
  interval_minutes: z.number().int().positive().optional(),
}).superRefine((data, ctx) => {
  if (!data.ai_enabled) return;

  if (!data.llm) {
    ctx.addIssue({ code: 'custom', message: 'LLM wajib jika AI aktif', path: ['llm'] });
  } else if (!AVAILABLE_LLM_VALUES.includes(data.llm)) {
    ctx.addIssue({ code: 'custom', message: 'Model LLM belum tersedia', path: ['llm'] });
  }
  if (!data.knowledge_files?.length) {
    ctx.addIssue({ code: 'custom', message: 'Knowledge base wajib', path: ['knowledge_files'] });
  }
  if (!data.tasks?.length) {
    ctx.addIssue({ code: 'custom', message: 'Minimal satu tugas AI', path: ['tasks'] });
  }
  if (data.response_mode === 'on_code' && !data.trigger_code?.trim()) {
    ctx.addIssue({ code: 'custom', message: 'Kode trigger wajib', path: ['trigger_code'] });
  }
  if (data.response_mode === 'interval' && !data.interval_minutes) {
    ctx.addIssue({ code: 'custom', message: 'Interval menit wajib', path: ['interval_minutes'] });
  }
});

const faqCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
});

const faqItemSchema = z.object({
  id: z.string(),
  categoryId: z.string().nullable(),
  question: z.string(),
  answer: z.string(),
});

export const createFaqBotSchema = z.object({
  nama: plainText(200),
  kode_id: z.string().min(1).max(50),
  categories: z.array(faqCategorySchema),
  faqs: z.array(faqItemSchema).min(1),
});

export const createAiAssistantSchema = z.object({
  nama: plainText(200),
  llm: availableLlmSchema,
  knowledge_files: z.array(knowledgeFileSchema).min(1),
});

export const sendMessageSchema = z.object({
  teks_pesan: plainText(10000),
});

export const aiChatSchema = z.object({
  message: plainText(10000),
  room_id: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

export const roomIdParamSchema = z.object({
  roomId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

export const roomMessageParamsSchema = z.object({
  roomId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  messageId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});
