/** Registry LLM backend — sinkron dengan src/modules/chat/llmOptions.js */

export const LLM_REGISTRY = [
  { value: 'deepseek-chat', provider: 'deepseek', model: 'deepseek-chat', available: true },
  { value: 'deepseek-reasoner', provider: 'deepseek', model: 'deepseek-reasoner', available: true },
  { value: 'gpt-4o', provider: 'openai', model: 'gpt-4o', available: false },
  { value: 'gpt-4o-mini', provider: 'openai', model: 'gpt-4o-mini', available: false },
  { value: 'claude-3-5-sonnet', provider: 'anthropic', model: 'claude-3-5-sonnet', available: false },
  { value: 'gemini-2-flash', provider: 'google', model: 'gemini-2-flash', available: false },
  { value: 'llama-3', provider: 'meta', model: 'llama-3', available: false },
];

export const AVAILABLE_LLM_VALUES = LLM_REGISTRY
  .filter((item) => item.available)
  .map((item) => item.value);

export function resolveLlm(llmValue) {
  const entry = LLM_REGISTRY.find((item) => item.value === llmValue && item.available);
  if (entry) return entry;

  return LLM_REGISTRY.find((item) => item.value === 'deepseek-chat');
}
