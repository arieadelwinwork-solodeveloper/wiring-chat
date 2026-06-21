import { useRef, useState } from 'react';
import LlmSelect from './LlmSelect';
import {
  DEFAULT_LLM,
  getLlmLabel,
  isLlmAvailable,
} from './llmOptions';

export { getLlmLabel, isLlmAvailable } from './llmOptions';
export { LLM_OPTIONS, DEFAULT_LLM, getAvailableLlmOptions } from './llmOptions';


function createFileId() {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function detectKnowledgeFileType(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (['doc', 'docx'].includes(extension)) return 'word';
  if (['xls', 'xlsx'].includes(extension)) return 'excel';

  const mime = file.type.toLowerCase();
  if (
    mime.includes('word')
    || mime === 'application/msword'
  ) {
    return 'word';
  }
  if (
    mime.includes('sheet')
    || mime.includes('excel')
    || mime === 'application/vnd.ms-excel'
  ) {
    return 'excel';
  }

  return null;
}

export function createKnowledgeFileEntry(file) {
  const type = detectKnowledgeFileType(file);
  if (!type) return null;

  return {
    id: createFileId(),
    name: file.name,
    type,
    size: file.size,
  };
}

export function createAiAssistantDraft() {
  return {
    nama: '',
    llm: DEFAULT_LLM,
    knowledgeFiles: [],
  };
}

export function formatKnowledgeFilesSummary(files = []) {
  if (!files.length) return 'Belum ada file';

  const wordCount = files.filter((item) => item.type === 'word').length;
  const excelCount = files.filter((item) => item.type === 'excel').length;
  const parts = [];

  if (wordCount) parts.push(`${wordCount} Word`);
  if (excelCount) parts.push(`${excelCount} Excel`);

  return parts.join(' · ');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function KnowledgeDropzone({ files, onAddFiles, onRemoveFile }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  function addFilesFromList(fileList) {
    const accepted = Array.from(fileList)
      .map(createKnowledgeFileEntry)
      .filter(Boolean);

    if (accepted.length > 0) {
      onAddFiles(accepted);
    }
  }

  function handleDragEnter(event) {
    event.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function handleDrop(event) {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    addFilesFromList(event.dataTransfer.files);
  }

  return (
    <div className="faq-bot-field ai-knowledge-upload">
      <span className="faq-bot-field__label">Knowledge Base</span>

      <div
        className={`ai-knowledge-dropzone${isDragging ? ' ai-knowledge-dropzone--active' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload knowledge base Word atau Excel"
      >
        <input
          ref={inputRef}
          type="file"
          className="ai-knowledge-dropzone__input"
          accept=".doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple
          onChange={(event) => {
            addFilesFromList(event.target.files);
            event.target.value = '';
          }}
        />

        <div className="ai-knowledge-dropzone__icon" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" strokeLinecap="round" />
          </svg>
        </div>
        <p className="ai-knowledge-dropzone__title">
          Drag and drop file knowledge base di sini
        </p>
        <p className="ai-knowledge-dropzone__subtitle">
          atau klik untuk memilih file
        </p>
        <p className="ai-knowledge-dropzone__formats">
          .doc · .docx · .xls · .xlsx — otomatis dikenali sistem
        </p>
      </div>

      {files.length > 0 && (
        <ul className="ai-knowledge-file-list">
          {files.map((file) => (
            <li key={file.id} className="ai-knowledge-file-list__item">
              <span className={`ai-knowledge-file-list__badge ai-knowledge-file-list__badge--${file.type}`}>
                {file.type === 'word' ? 'DOC' : 'XLS'}
              </span>
              <div className="ai-knowledge-file-list__info">
                <span className="ai-knowledge-file-list__name">{file.name}</span>
                <span className="ai-knowledge-file-list__meta">
                  {file.type === 'word' ? 'Microsoft Word' : 'Microsoft Excel'} · {formatFileSize(file.size)}
                </span>
              </div>
              <button
                type="button"
                className="ai-knowledge-file-list__remove"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveFile(file.id);
                }}
                aria-label={`Hapus ${file.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AiAssistantBuilder({ draft, onChange, onSave, onClose }) {
  function updateField(field, value) {
    onChange({ ...draft, [field]: value });
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

  const canSave = draft.nama.trim()
    && draft.llm
    && isLlmAvailable(draft.llm)
    && draft.knowledgeFiles.length > 0;

  return (
    <div className="faq-bot-builder ai-assistant-builder">
      <header className="faq-bot-builder__header">
        <button
          type="button"
          className="faq-bot-builder__back"
          onClick={onClose}
          aria-label="Kembali"
        >
          &lt;
        </button>
        <h2 className="faq-bot-builder__title">Generate AI Assistant</h2>
      </header>

      <div className="faq-bot-builder__body">
        <p className="faq-bot-flow-hint">
          Lengkapi konfigurasi berikut sebelum AI Assistant digenerate.
        </p>

        <div className="ai-assistant-builder__fields">
          <label className="faq-bot-field">
            <span className="faq-bot-field__label">Nama AI Assistant</span>
            <input
              type="text"
              className="faq-bot-field__input"
              placeholder="Contoh: Asisten Operasional"
              value={draft.nama}
              onChange={(e) => updateField('nama', e.target.value)}
            />
          </label>

          <div className="faq-bot-field">
            <span className="faq-bot-field__label">Basis LLM</span>
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
        </div>
      </div>

      <footer className="faq-bot-builder__footer">
        <button
          type="button"
          className="faq-bot-builder__save"
          onClick={onSave}
          disabled={!canSave}
        >
          Generate AI Assistant
        </button>
      </footer>
    </div>
  );
}
