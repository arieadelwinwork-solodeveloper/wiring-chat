import { useMemo, useState } from 'react';
import {
  KnowledgeDropzone,
  formatKnowledgeFilesSummary,
  getLlmLabel,
} from './AiAssistantBuilder';
import './OwnerSidebarTools.css';

function Chevron({ open }) {
  return (
    <svg
      className={`owner-tools__chevron${open ? ' owner-tools__chevron--open' : ''}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ActionCard({ icon, label, hint, variant, onClick }) {
  return (
    <button
      type="button"
      className={`owner-action-card${variant ? ` owner-action-card--${variant}` : ''}`}
      onClick={onClick}
    >
      <span className={`owner-action-card__icon${variant ? ` owner-action-card__icon--${variant}` : ''}`} aria-hidden>
        {icon}
      </span>
      <span className="owner-action-card__text">
        <span className="owner-action-card__label">{label}</span>
        {hint && <span className="owner-action-card__hint">{hint}</span>}
      </span>
    </button>
  );
}

function ReleasedAgentRow({
  agent,
  isActive,
  onSelect,
  onToggleOnline,
  onDelete,
}) {
  return (
    <div className={`owner-agent-row${isActive ? ' owner-agent-row--active' : ''}`}>
      <button type="button" className="owner-agent-row__main" onClick={onSelect}>
        <span className={`owner-agent-row__icon${agent.kind === 'ai' ? ' owner-agent-row__icon--ai' : ''}`} aria-hidden>
          {agent.kind === 'ai' ? '✦' : '?'}
        </span>
        <span className="owner-agent-row__info">
          <span className="owner-agent-row__name">{agent.nama}</span>
          <span className="owner-agent-row__meta">{agent.meta}</span>
        </span>
      </button>
      <div className="owner-agent-row__controls">
        <button
          type="button"
          className={`owner-agent-row__status${agent.online ? ' owner-agent-row__status--online' : ''}`}
          onClick={() => onToggleOnline(agent.id)}
          title={agent.online ? 'Set offline' : 'Set online'}
        >
          {agent.online ? 'Online' : 'Offline'}
        </button>
        <button
          type="button"
          className="owner-agent-row__delete"
          onClick={() => onDelete(agent.id)}
          aria-label={`Hapus ${agent.nama}`}
          title="Hapus agent"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function buildReleasedAgents(bots) {
  if (!bots.aiAssistant?.generated) return [];

  return [{
    id: 'ai',
    kind: 'ai',
    nama: bots.aiAssistant.nama || 'AI Assistant',
    meta: `${getLlmLabel(bots.aiAssistant.llm)} · ${formatKnowledgeFilesSummary(bots.aiAssistant.knowledgeFiles)}`,
    online: bots.aiAssistant.online !== false,
    roomId: bots.aiAssistant.roomId ?? 'bot-ai-assistant',
  }];
}

export default function OwnerSidebarTools({
  bots,
  activeRoomId,
  onOpenGroup,
  onOpenFaqBuilder,
  onOpenAiBuilder,
  onSelectAgentRoom,
  onToggleAgentOnline,
  onDeleteAgent,
  onAddKnowledgeFiles,
  onRemoveKnowledgeFile,
}) {
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [agentsExpanded, setAgentsExpanded] = useState(false);

  const releasedAgents = useMemo(() => buildReleasedAgents(bots), [bots]);
  const onlineCount = releasedAgents.filter((a) => a.online).length;
  const hasAiAgent = bots.aiAssistant?.generated;

  return (
    <div className="owner-tools">
      <button
        type="button"
        className="owner-tools__toggle"
        onClick={() => setPanelExpanded((prev) => !prev)}
        aria-expanded={panelExpanded}
      >
        <span className="owner-tools__toggle-label">Kelola workspace</span>
        <span className="owner-tools__toggle-meta">
          {hasAiAgent ? `Agent AI · ${onlineCount} online` : 'Aksi owner'}
        </span>
        <Chevron open={panelExpanded} />
      </button>

      {panelExpanded && (
        <div className="owner-tools__body">
          <ActionCard
            icon="#"
            label="Buat group"
            hint="Grup obrolan tim"
            onClick={onOpenGroup}
          />
          <ActionCard
            icon="?"
            label="Generate Bot FAQ"
            hint="Buat bot untuk FAQ pelanggan"
            onClick={onOpenFaqBuilder}
          />
          <ActionCard
            icon="✦"
            label="Generate Agent AI"
            hint="Buat asisten AI untuk tim"
            variant="ai"
            onClick={onOpenAiBuilder}
          />

          {(hasAiAgent || releasedAgents.length > 0) && (
            <div className="owner-tools__agents-section">
              <button
                type="button"
                className="owner-tools__agents-toggle"
                onClick={() => setAgentsExpanded((prev) => !prev)}
                aria-expanded={agentsExpanded}
              >
                <span>Agent AI · {onlineCount} online</span>
                <Chevron open={agentsExpanded} />
              </button>

              {agentsExpanded && (
                <div className="owner-tools__agents-panel">
                  {releasedAgents.length === 0 ? (
                    <p className="owner-tools__agents-empty">Belum ada agent dirilis.</p>
                  ) : (
                    <ul className="owner-tools__agents-list">
                      {releasedAgents.map((agent) => (
                        <li key={agent.id}>
                          <ReleasedAgentRow
                            agent={agent}
                            isActive={agent.roomId === activeRoomId}
                            onSelect={() => onSelectAgentRoom(agent.roomId)}
                            onToggleOnline={onToggleAgentOnline}
                            onDelete={onDeleteAgent}
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  {hasAiAgent && (
                    <div className="owner-tools__kb">
                      <span className="owner-tools__kb-label">Tambah knowledge base</span>
                      <KnowledgeDropzone
                        files={bots.aiAssistant.knowledgeFiles ?? []}
                        onAddFiles={(files) => onAddKnowledgeFiles('ai', files)}
                        onRemoveFile={(fileId) => onRemoveKnowledgeFile('ai', fileId)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!panelExpanded && hasAiAgent && (
        <button
          type="button"
          className="owner-tools__collapsed-summary"
          onClick={() => {
            setPanelExpanded(true);
            setAgentsExpanded(true);
          }}
        >
          Agent AI · {onlineCount} online
        </button>
      )}

    </div>
  );
}
