const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('wiring_access_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? 'Terjadi kesalahan sistem');
  }

  return data;
}

export const chatApi = {
  isEnabled: () => import.meta.env.VITE_USE_API !== 'false',

  getProfile: () => request('/profile/me'),
  updateProfile: (body) => request('/profile/me', { method: 'PATCH', body: JSON.stringify(body) }),

  getContacts: () => request('/contacts'),
  getInvitableMembers: () => request('/contacts/invitable'),
  createContact: (body) => request('/contacts', { method: 'POST', body: JSON.stringify(body) }),

  getRooms: () => request('/rooms'),
  getMessages: (roomId) => request(`/rooms/${roomId}/messages`),
  sendMessage: (roomId, teks_pesan) =>
    request(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ teks_pesan }),
    }),
  deleteMessage: (roomId, messageId) =>
    request(`/rooms/${roomId}/messages/${messageId}`, { method: 'DELETE' }),

  createGroup: (body) => request('/groups', { method: 'POST', body: JSON.stringify(body) }),
  createFaqBot: (body) => request('/bots/faq', { method: 'POST', body: JSON.stringify(body) }),
  createAiAssistant: (body) =>
    request('/bots/ai-assistant', { method: 'POST', body: JSON.stringify(body) }),

  health: () => request('/health'),
};

export function mapContactFromApi(contact) {
  return {
    id: contact.id,
    nama: contact.nama,
    nomorId: contact.nomorId ?? contact.nomor_id,
    status: contact.status,
  };
}

export function mapGroupPayloadFromDraft(draft) {
  return {
    nama: draft.nama.trim(),
    member_ids: draft.memberIds,
    ai_enabled: draft.aiEnabled,
    llm: draft.llm || undefined,
    knowledge_files: draft.knowledgeFiles?.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.size,
    })),
    tasks: draft.tasks,
    response_mode: draft.responseMode,
    trigger_code: draft.triggerCode || undefined,
    interval_minutes: draft.intervalMinutes ? Number(draft.intervalMinutes) : undefined,
  };
}

export function mapFaqPayloadFromDraft(draft) {
  return {
    nama: draft.nama.trim(),
    kode_id: draft.kodeId,
    categories: draft.categories.map((c) => ({ id: c.id, name: c.name })),
    faqs: draft.faqs.map((f) => ({
      id: f.id,
      categoryId: f.categoryId,
      question: f.question,
      answer: f.answer,
    })),
  };
}

export function mapAiPayloadFromDraft(draft) {
  return {
    nama: draft.nama.trim(),
    llm: draft.llm,
    knowledge_files: draft.knowledgeFiles.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.size,
    })),
  };
}

export function mapContactPayloadFromForm(draft) {
  return {
    nama: draft.nama.trim(),
    nomor_id: draft.nomorId.trim(),
    status: draft.status,
  };
}
