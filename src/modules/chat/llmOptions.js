/** Daftar LLM — DeepSeek aktif, provider lain belum tersedia */

export const LLM_OPTIONS = [
  {
    value: 'deepseek-chat',
    label: 'DeepSeek Chat',
    provider: 'deepseek',
    available: true,
    description: 'Model utama DeepSeek untuk chat & rangkuman',
  },
  {
    value: 'deepseek-reasoner',
    label: 'DeepSeek Reasoner',
    provider: 'deepseek',
    available: true,
    description: 'DeepSeek dengan reasoning lebih dalam',
  },
  {
    value: 'gpt-4o',
    label: 'OpenAI GPT-4o',
    provider: 'openai',
    available: false,
    description: 'Segera hadir',
  },
  {
    value: 'gpt-4o-mini',
    label: 'OpenAI GPT-4o mini',
    provider: 'openai',
    available: false,
    description: 'Segera hadir',
  },
  {
    value: 'claude-3-5-sonnet',
    label: 'Anthropic Claude 3.5 Sonnet',
    provider: 'anthropic',
    available: false,
    description: 'Segera hadir',
  },
  {
    value: 'gemini-2-flash',
    label: 'Google Gemini 2.0 Flash',
    provider: 'google',
    available: false,
    description: 'Segera hadir',
  },
  {
    value: 'llama-3',
    label: 'Meta Llama 3',
    provider: 'meta',
    available: false,
    description: 'Segera hadir',
  },
];

export const DEFAULT_LLM = 'deepseek-chat';

export function getLlmLabel(value) {
  return LLM_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function isLlmAvailable(value) {
  const option = LLM_OPTIONS.find((item) => item.value === value);
  return Boolean(option?.available);
}

export function getAvailableLlmOptions() {
  return LLM_OPTIONS.filter((item) => item.available);
}
