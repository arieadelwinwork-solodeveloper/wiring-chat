import LlmSelect from './LlmSelect';
import { isLlmAvailable } from './llmOptions';
import {
  KnowledgeDropzone,
  formatKnowledgeFilesSummary,
  getLlmLabel,
} from './AiAssistantBuilder';

export const AI_TASK_OPTIONS = [
  { value: 'reminder', label: 'Reminder' },
  { value: 'virtual_manager', label: 'Manajer virtual' },
];

export const RESPONSE_MODE_OPTIONS = [
  { value: 'always', label: 'Setiap saat' },
  { value: 'on_code', label: 'Ketika dipanggil dengan kode' },
  { value: 'interval', label: 'Setiap … menit' },
];

export function createGroupDraft() {
  return {
    nama: '',
    memberIds: [],
    aiEnabled: false,
    llm: 'deepseek-chat',
    knowledgeFiles: [],
    tasks: [],
    responseMode: 'always',
    triggerCode: '',
    intervalMinutes: '',
  };
}

export function getAiTaskLabel(value) {
  return AI_TASK_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function formatResponseModeSummary(ai) {
  if (!ai) return 'AI nonaktif';

  if (ai.responseMode === 'always') return 'Respon setiap saat';
  if (ai.responseMode === 'on_code') {
    return `Dipanggil dengan kode: ${ai.triggerCode || '—'}`;
  }
  return `Setiap ${ai.intervalMinutes || '—'} menit`;
}

export function formatGroupPreview(group) {
  const memberCount = group.memberIds?.length ?? 0;
  if (!group.aiEnabled) {
    return `${memberCount} anggota`;
  }

  const tasks = (group.tasks ?? [])
    .map(getAiTaskLabel)
    .join(', ');

  return `${memberCount} anggota · AI · ${tasks || 'Tanpa tugas'}`;
}

export function CreateGroupTrigger({ onClick }) {
  return (
    <button type="button" className="create-group__trigger" onClick={onClick}>
      <span className="create-group__trigger-icon" aria-hidden>#</span>
      <span>Buat group</span>
    </button>
  );
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="create-group__toggle">
      <span className="create-group__toggle-label">{label}</span>
      <span className="create-group__toggle-control">
        <input
          type="checkbox"
          className="create-group__toggle-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="create-group__toggle-track" aria-hidden />
      </span>
    </label>
  );
}

export default function CreateGroupBuilder({
  draft,
  onChange,
  onSave,
  onClose,
  availableMembers,
}) {
  function updateField(field, value) {
    onChange({ ...draft, [field]: value });
  }

  function toggleMember(memberId) {
    const next = draft.memberIds.includes(memberId)
      ? draft.memberIds.filter((id) => id !== memberId)
      : [...draft.memberIds, memberId];

    updateField('memberIds', next);
  }

  function toggleTask(taskValue) {
    const next = draft.tasks.includes(taskValue)
      ? draft.tasks.filter((item) => item !== taskValue)
      : [...draft.tasks, taskValue];

    updateField('tasks', next);
  }

  function addKnowledgeFiles(newFiles) {
    onChange({
      ...draft,
      knowledgeFiles: [...draft.knowledgeFiles, ...newFiles],
    });
  }

  function removeKnowledgeFile(fileId) {
    onChange({
      ...draft,
      knowledgeFiles: draft.knowledgeFiles.filter((item) => item.id !== fileId),
    });
  }

  const aiFieldsValid = !draft.aiEnabled || (
    draft.llm
    && isLlmAvailable(draft.llm)
    && draft.knowledgeFiles.length > 0
    && draft.tasks.length > 0
    && (
      draft.responseMode === 'always'
      || (draft.responseMode === 'on_code' && draft.triggerCode.trim())
      || (draft.responseMode === 'interval' && Number(draft.intervalMinutes) > 0)
    )
  );

  const canSave = draft.nama.trim() && draft.memberIds.length > 0 && aiFieldsValid;

  return (
    <div className="faq-bot-builder create-group-builder">
      <header className="faq-bot-builder__header">
        <button
          type="button"
          className="faq-bot-builder__back"
          onClick={onClose}
          aria-label="Kembali"
        >
          &lt;
        </button>
        <h2 className="faq-bot-builder__title">Buat group</h2>
      </header>

      <div className="faq-bot-builder__body">
        <p className="faq-bot-flow-hint">
          Buat grup obrolan internal dan undang anggota tim. Aktifkan AI grup untuk merangkum diskusi yang belum terjawab.
        </p>

        <div className="create-group-builder__fields">
          <label className="faq-bot-field">
            <span className="faq-bot-field__label">Nama group <span className="faq-bot-field__required" aria-hidden>*</span></span>
            <input
              type="text"
              className="faq-bot-field__input"
              placeholder="Contoh: Tim Produk Q3"
              value={draft.nama}
              onChange={(e) => updateField('nama', e.target.value)}
            />
          </label>

          <div className="faq-bot-field">
            <span className="faq-bot-field__label">Daftar yang diundang <span className="faq-bot-field__required" aria-hidden>*</span></span>
            {availableMembers.length === 0 ? (
              <p className="create-group__empty-members">
                Belum ada kontak. Undang teman terlebih dahulu.
              </p>
            ) : (
              <ul className="create-group__member-list">
                {availableMembers.map((member) => {
                  const selected = draft.memberIds.includes(member.id);
                  return (
                    <li key={member.id}>
                      <button
                        type="button"
                        className={`create-group__member-item${selected ? ' create-group__member-item--selected' : ''}`}
                        onClick={() => toggleMember(member.id)}
                        aria-pressed={selected}
                      >
                        <span className="create-group__member-check" aria-hidden>
                          {selected ? '✓' : ''}
                        </span>
                        <span className="create-group__member-info">
                          <span className="create-group__member-name">{member.nama}</span>
                          <span className="create-group__member-meta">{member.subtitle}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <ToggleSwitch
            label="Fitur AI grup"
            checked={draft.aiEnabled}
            onChange={(value) => updateField('aiEnabled', value)}
          />

          {draft.aiEnabled && (
            <div className="create-group__ai-panel">
              <div className="faq-bot-field">
                <span className="faq-bot-field__label">Basis LLM <span className="faq-bot-field__required" aria-hidden>*</span></span>
                <LlmSelect
                  value={draft.llm}
                  onChange={(value) => updateField('llm', value)}
                />
              </div>

              <KnowledgeDropzone
                files={draft.knowledgeFiles}
                onAddFiles={addKnowledgeFiles}
                onRemoveFile={removeKnowledgeFile}
              />

              <div className="faq-bot-field">
                <span className="faq-bot-field__label">Tugas AI <span className="faq-bot-field__required" aria-hidden>*</span></span>
                <div className="create-group__task-options">
                  {AI_TASK_OPTIONS.map((option) => {
                    const selected = draft.tasks.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`create-group__task-chip${selected ? ' create-group__task-chip--selected' : ''}`}
                        onClick={() => toggleTask(option.value)}
                        aria-pressed={selected}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="faq-bot-field">
                <span className="faq-bot-field__label">Waktu respon AI <span className="faq-bot-field__required" aria-hidden>*</span></span>
                <div className="create-group__response-modes">
                  {RESPONSE_MODE_OPTIONS.map((option) => (
                    <label key={option.value} className="create-group__response-option">
                      <input
                        type="radio"
                        name="responseMode"
                        value={option.value}
                        checked={draft.responseMode === option.value}
                        onChange={() => updateField('responseMode', option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>

                {draft.responseMode === 'on_code' && (
                  <input
                    type="text"
                    className="faq-bot-field__input create-group__response-input"
                    placeholder="Contoh: @ai-grup"
                    value={draft.triggerCode}
                    onChange={(e) => updateField('triggerCode', e.target.value)}
                  />
                )}

                {draft.responseMode === 'interval' && (
                  <div className="create-group__interval-row">
                    <span>Setiap</span>
                    <input
                      type="number"
                      min="1"
                      className="faq-bot-field__input create-group__interval-input"
                      placeholder="30"
                      value={draft.intervalMinutes}
                      onChange={(e) => updateField('intervalMinutes', e.target.value)}
                    />
                    <span>menit</span>
                  </div>
                )}
              </div>

              <div className="create-group__ai-note">
                <strong>Perilaku AI grup</strong>
                <p>
                  AI merangkum dari pesan yang belum dibalas dalam riwayat chat maksimal 1 hari.
                  Pesan basa-basi, candaan, atau yang tidak berkaitan dengan knowledge base akan diabaikan.
                </p>
                {draft.llm && draft.knowledgeFiles.length > 0 && (
                  <p className="create-group__ai-note-meta">
                    {getLlmLabel(draft.llm)} · {formatKnowledgeFilesSummary(draft.knowledgeFiles)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="faq-bot-builder__footer">
        <button
          type="button"
          className="faq-bot-builder__save"
          onClick={onSave}
          disabled={!canSave}
        >
          Buat group
        </button>
      </footer>
    </div>
  );
}
