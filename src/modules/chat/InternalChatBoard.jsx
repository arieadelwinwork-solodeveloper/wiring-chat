import { useEffect, useMemo, useRef, useState } from 'react';
import AiAssistantBuilder, {
  createAiAssistantDraft,
  formatKnowledgeFilesSummary,
  getLlmLabel,
} from './AiAssistantBuilder';
import './AiAssistantBuilder.css';
import CreateGroupBuilder, {
  createGroupDraft,
  formatGroupPreview,
  formatResponseModeSummary,
  getAiTaskLabel,
} from './CreateGroupBuilder';
import './CreateGroupBuilder.css';
import FaqBotBuilder, { createFaqBotDraft } from './FaqBotBuilder';
import './FaqBotBuilder.css';
import InviteFriendsForm, {
  InviteFriendsTrigger,
  contactToRoom,
  getContactStatusLabel,
} from './InviteFriendsPanel';
import './InviteFriendsPanel.css';
import OwnerSidebarTools from './OwnerSidebarTools';
import './OwnerSidebarTools.css';
import SwipeableRoomItem from './SwipeableRoomItem';
import './SwipeableRoomItem.css';
import ChatMessageBubble from './ChatMessageBubble';
import './ChatMessageBubble.css';
import MessageHoldMenu from './MessageHoldMenu';
import './MessageHoldMenu.css';
import MessageSelectionBar from './MessageSelectionBar';
import './MessageSelectionBar.css';
import { formatMessagesForCopy } from './messageFormat';
import './InternalChatBoard.css';
import { useChatBackend } from '../../hooks/useChatBackend';
import { getOrCreateLocalNomorId } from '../../lib/nomorId';
import {
  chatApi,
  mapAiPayloadFromDraft,
  mapContactPayloadFromForm,
  mapFaqPayloadFromDraft,
  mapGroupPayloadFromDraft,
} from '../../services/chatApi';
const CURRENT_USER_ID = 'user-me';

const DEFAULT_USER = {
  name: 'Pengguna',
  avatarColor: '#0a2540',
  initials: 'PG',
  nomorId: null,
};

const DEFAULT_BOTS = {
  faq: { generated: false, label: 'Bot FAQ', nama: '', kodeId: '', online: true },
  aiAssistant: {
    generated: false,
    label: 'AI Assistant',
    nama: '',
    llm: '',
    knowledgeFiles: [],
    online: true,
  },
};

function buildBotRooms(bots) {
  const rooms = [];

  if (bots.faq.generated) {
    rooms.push({
      id: `bot-${bots.faq.kodeId}`,
      nama_room: bots.faq.nama || 'Bot FAQ',
      tipe: 'bot_faq',
      avatar: '#5ac8fa',
      initials: 'FAQ',
      lastMessage: `Kode: ${bots.faq.kodeId} · Siap digunakan`,
      lastTime: 'Baru',
      isBot: true,
      botType: 'faq',
      statusLabel: 'Bot',
    });
  }

  if (bots.aiAssistant.generated) {
    const aiName = bots.aiAssistant.nama || 'AI Assistant';
    rooms.push({
      id: 'bot-ai-assistant',
      nama_room: aiName,
      tipe: 'bot_ai',
      avatar: '#0a2540',
      initials: getInitials(aiName),
      lastMessage: `${getLlmLabel(bots.aiAssistant.llm)} · ${formatKnowledgeFilesSummary(bots.aiAssistant.knowledgeFiles)}`,
      lastTime: 'Baru',
      isBot: true,
      botType: 'ai',
      statusLabel: 'AI',
    });
  }

  return rooms;
}

function buildInvitableMembers(contacts) {
  return contacts.map((contact) => ({
    id: contact.id,
    nama: contact.nama,
    subtitle: `${contact.nomorId} · ${getContactStatusLabel(contact.status)}`,
  }));
}

function groupToRoom(group) {
  return {
    id: group.id,
    nama_room: group.nama,
    tipe: 'group',
    avatar: '#5856d6',
    initials: getInitials(group.nama),
    lastMessage: formatGroupPreview(group),
    lastTime: group.lastTime || 'Baru',
    isGroup: true,
    aiEnabled: group.aiEnabled,
    groupConfig: group,
  };
}

function buildGroupWelcomeMessage(group, memberNames) {
  const lines = [
    `Selamat datang di grup "${group.nama}".`,
    `Anggota: ${memberNames.join(', ')}`,
  ];

  if (group.aiEnabled) {
    const tasks = group.tasks.map(getAiTaskLabel).join(', ');
    lines.push(
      '',
      'AI Grup aktif dengan konfigurasi:',
      `• LLM: ${getLlmLabel(group.llm)}`,
      `• Knowledge base: ${formatKnowledgeFilesSummary(group.knowledgeFiles)}`,
      `• Tugas: ${tasks}`,
      `• Waktu respon: ${formatResponseModeSummary(group)}`,
      '',
      'AI akan merangkum pesan yang belum dibalas dari riwayat chat maksimal 1 hari. Pesan basa-basi, candaan, atau yang tidak berkaitan dengan knowledge base akan diabaikan.',
    );
  }

  return lines.join('\n');
}

function buildFaqWelcomeMessage(botName, categories) {
  const categoryList = categories
    .filter((item) => item.name.trim())
    .map((item) => `• ${item.name}`)
    .join('\n');

  const intro = `Halo! Saya ${botName}. Pilih kategorisasi untuk memulai.`;
  return categoryList ? `${intro}\n\nKategorisasi:\n${categoryList}` : intro;
}

function buildAiWelcomeMessage(nama, llm, knowledgeFiles) {
  const fileNames = knowledgeFiles.map((file) => `• ${file.name}`).join('\n');

  return [
    `Halo! Saya ${nama}.`,
    `Saya berbasis ${getLlmLabel(llm)} dengan knowledge base dari ${formatKnowledgeFilesSummary(knowledgeFiles)}:`,
    fileNames,
    'Ada yang bisa saya bantu untuk tim Anda?',
  ].join('\n\n');
}

function UserProfileMenu({
  user,
  role,
  bots,
  activeRoomId,
  onSelectRoom,
  onOpenInviteForm,
  onOpenGroupBuilder,
  onChangeName,
  onChangeAvatar,
  onOpenFaqBuilder,
  onOpenAiAssistant,
  onToggleAgentOnline,
  onDeleteAgent,
  onAddKnowledgeFiles,
  onRemoveKnowledgeFile,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const isOwner = role === 'owner';

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleChangeName() {
    setOpen(false);
    const nextName = window.prompt('Ganti nama', user.name);
    if (nextName?.trim()) onChangeName(nextName.trim());
  }

  function handleChangeAvatar() {
    setOpen(false);
    onChangeAvatar();
  }

  return (
    <div className="chat-user-profile" ref={menuRef}>
      <button
        type="button"
        className="chat-user-profile__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div
          className="chat-user-profile__avatar"
          style={{ background: user.avatarColor }}
        >
          {user.initials}
        </div>
        <div className="chat-user-profile__meta">
          <span className="chat-user-profile__name">{user.name}</span>
          {user.nomorId && (
            <span className="chat-user-profile__id" title="Bagikan ID ini agar teman bisa mengundang Anda">
              {user.nomorId}
            </span>
          )}
        </div>
        {isOwner ? (
          <span className="chat-user-profile__badge chat-user-profile__badge--owner">Owner</span>
        ) : (
          <span className="chat-user-profile__badge">User</span>
        )}
        <svg
          className={`chat-user-profile__chevron${open ? ' chat-user-profile__chevron--open' : ''}`}
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
      </button>

      <InviteFriendsTrigger onClick={onOpenInviteForm} />

      {isOwner && (
        <OwnerSidebarTools
          bots={bots}
          activeRoomId={activeRoomId}
          onOpenGroup={onOpenGroupBuilder}
          onOpenFaqBuilder={onOpenFaqBuilder}
          onOpenAiBuilder={onOpenAiAssistant}
          onSelectAgentRoom={onSelectRoom}
          onToggleAgentOnline={onToggleAgentOnline}
          onDeleteAgent={onDeleteAgent}
          onAddKnowledgeFiles={onAddKnowledgeFiles}
          onRemoveKnowledgeFile={onRemoveKnowledgeFile}
        />
      )}

      {open && (
        <div className="chat-user-menu" role="menu">
          <button type="button" className="chat-user-menu__item" role="menuitem" onClick={handleChangeAvatar}>
            Ganti profil
          </button>
          <button type="button" className="chat-user-menu__item" role="menuitem" onClick={handleChangeName}>
            Ganti nama
          </button>
        </div>
      )}
    </div>
  );
}

function getInitials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = ['#0a2540', '#5856d6', '#007aff', '#34c759', '#ff9500', '#ff2d55'];

export default function InternalChatBoard({ role: defaultRole = 'user' }) {
  const backend = useChatBackend(defaultRole);
  const role = backend.profile?.role ?? defaultRole;
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [draft, setDraft] = useState('');
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER);
  const [bots, setBots] = useState(DEFAULT_BOTS);
  const [botNotice, setBotNotice] = useState('');
  const [botCodeCounter, setBotCodeCounter] = useState(1);
  const [faqBotDraft, setFaqBotDraft] = useState(null);
  const [showFaqBuilder, setShowFaqBuilder] = useState(false);
  const [aiAssistantDraft, setAiAssistantDraft] = useState(null);
  const [showAiBuilder, setShowAiBuilder] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showGroupBuilder, setShowGroupBuilder] = useState(false);
  const [groupDraft, setGroupDraft] = useState(null);
  const [groups, setGroups] = useState([]);
  const [botMessages, setBotMessages] = useState({});
  const [contacts, setContacts] = useState([]);
  const [hiddenRoomIds, setHiddenRoomIds] = useState(() => new Set());
  const [messageActionMode, setMessageActionMode] = useState(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState(() => new Set());
  const [holdMenu, setHoldMenu] = useState(null);

  useEffect(() => {
    if (backend.useApi && backend.profile) {
      setCurrentUser({
        name: backend.profile.name,
        avatarColor: backend.profile.avatarColor,
        initials: backend.profile.initials ?? getInitials(backend.profile.name),
        nomorId: backend.profile.nomorId ?? null,
      });
      return;
    }

    if (!backend.useApi) {
      setCurrentUser((prev) => ({
        ...prev,
        nomorId: getOrCreateLocalNomorId(),
      }));
    }
  }, [backend.useApi, backend.profile]);

  useEffect(() => {
    if (backend.useApi && activeRoomId) {
      backend.loadMessages(activeRoomId);
    }
  }, [backend.useApi, activeRoomId, backend.loadMessages]);

  useEffect(() => {
    if (backend.useApi) {
      setContacts(backend.contacts);
    }
  }, [backend.useApi, backend.contacts]);

  const botRooms = useMemo(() => {
    if (backend.useApi) {
      return role === 'owner' ? backend.ownerBots : backend.rooms.filter((r) => r.isBot);
    }
    return buildBotRooms(bots);
  }, [backend.useApi, backend.ownerBots, backend.rooms, role, bots]);

  const contactRooms = useMemo(() => {
    if (backend.useApi) return backend.rooms.filter((r) => r.isContact);
    return contacts.map(contactToRoom);
  }, [backend.useApi, backend.rooms, contacts]);

  const groupRooms = useMemo(() => {
    if (backend.useApi) return backend.rooms.filter((r) => r.isGroup);
    return groups.map(groupToRoom);
  }, [backend.useApi, backend.rooms, groups]);

  const invitableMembers = useMemo(() => {
    if (backend.useApi) return backend.invitableMembers;
    return buildInvitableMembers(contacts);
  }, [backend.useApi, backend.invitableMembers, contacts]);

  const sidebarRooms = useMemo(() => {
    let rooms;
    if (backend.useApi) {
      rooms = backend.rooms;
    } else if (role === 'owner') {
      rooms = [...groupRooms, ...contactRooms];
    } else {
      rooms = [...groupRooms, ...contactRooms, ...botRooms];
    }
    return rooms.filter((room) => !hiddenRoomIds.has(room.id));
  }, [backend.useApi, backend.rooms, role, groupRooms, contactRooms, botRooms, hiddenRoomIds]);

  const chatRooms = useMemo(() => {
    if (backend.useApi) {
      return role === 'owner'
        ? [...backend.rooms, ...backend.ownerBots]
        : backend.rooms;
    }
    return [...groupRooms, ...contactRooms, ...botRooms];
  }, [backend.useApi, backend.rooms, backend.ownerBots, role, groupRooms, contactRooms, botRooms]);

  useEffect(() => {
    if (!chatRooms.length) {
      if (activeRoomId) setActiveRoomId(null);
      return;
    }
    if (!activeRoomId || !chatRooms.find((room) => room.id === activeRoomId)) {
      setActiveRoomId(chatRooms[0].id);
    }
  }, [chatRooms, activeRoomId]);

  const activeRoom = chatRooms.find((room) => room.id === activeRoomId);
  const messages = backend.useApi
    ? (backend.messagesByRoom[activeRoomId] ?? [])
    : (botMessages[activeRoomId] ?? []);

  useEffect(() => {
    cancelMessageAction();
  }, [activeRoomId]);

  function cancelMessageAction() {
    setMessageActionMode(null);
    setSelectedMessageIds(new Set());
    setHoldMenu(null);
  }

  function clampMenuPosition(x, y) {
    const padding = 12;
    const menuW = 160;
    const menuH = 96;
    return {
      x: Math.min(Math.max(x, padding + menuW / 2), window.innerWidth - padding - menuW / 2),
      y: Math.min(Math.max(y, padding + menuH), window.innerHeight - padding),
    };
  }

  function handleMessageHold(messageId, clientX, clientY) {
    const pos = clampMenuPosition(clientX, clientY);
    setHoldMenu({ messageId, ...pos });
  }

  function startMessageCopyMode(messageId) {
    setHoldMenu(null);
    setMessageActionMode('copy');
    setSelectedMessageIds(new Set([messageId]));
  }

  function startMessageDeleteMode(messageId) {
    setHoldMenu(null);
    setMessageActionMode('delete');
    setSelectedMessageIds(new Set([messageId]));
  }

  function toggleMessageSelection(messageId) {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  async function handleConfirmCopyMessages() {
    const selected = messages.filter((msg) => selectedMessageIds.has(msg.id));
    if (!selected.length) return;

    const text = formatMessagesForCopy(selected, currentUser.name);

    try {
      await navigator.clipboard.writeText(text);
      setBotNotice(`${selected.length} pesan disalin.`);
    } catch {
      setBotNotice('Gagal menyalin pesan.');
    }

    window.setTimeout(() => setBotNotice(''), 3000);
    cancelMessageAction();
  }

  async function handleConfirmDeleteMessages() {
    const ids = [...selectedMessageIds];
    if (!ids.length) return;

    await Promise.all(ids.map((id) => handleDeleteMessage(id)));
    cancelMessageAction();
  }

  function closePanels() {
    setShowFaqBuilder(false);
    setShowAiBuilder(false);
    setShowInviteForm(false);
    setShowGroupBuilder(false);
    setFaqBotDraft(null);
    setAiAssistantDraft(null);
    setGroupDraft(null);
  }

  function handleSelectRoom(roomId) {
    closePanels();
    cancelMessageAction();
    setActiveRoomId(roomId);
  }

  function handleDeleteRoom(roomId) {
    const remaining = sidebarRooms.filter((room) => room.id !== roomId);

    setHiddenRoomIds((prev) => new Set([...prev, roomId]));

    if (roomId.startsWith('group-')) {
      setGroups((prev) => prev.filter((group) => group.id !== roomId));
    }

    const contactMatch = contacts.find((contact) => contactToRoom(contact).id === roomId);
    if (contactMatch) {
      setContacts((prev) => prev.filter((contact) => contact.id !== contactMatch.id));
    }

    if (activeRoomId === roomId) {
      setActiveRoomId(remaining[0]?.id ?? '');
    }
  }

  function handleOpenInviteForm() {
    closePanels();
    setShowInviteForm(true);
  }

  function handleCloseInviteForm() {
    setShowInviteForm(false);
  }

  function handleOpenGroupBuilder() {
    closePanels();
    setGroupDraft(createGroupDraft());
    setShowGroupBuilder(true);
  }

  function handleCloseGroupBuilder() {
    setShowGroupBuilder(false);
    setGroupDraft(null);
  }

  function handleSaveGroup() {
    if (!groupDraft?.nama.trim() || !groupDraft.memberIds.length) return;

    const aiValid = !groupDraft.aiEnabled || (
      groupDraft.llm
      && groupDraft.knowledgeFiles.length > 0
      && groupDraft.tasks.length > 0
      && (
        groupDraft.responseMode === 'always'
        || (groupDraft.responseMode === 'on_code' && groupDraft.triggerCode.trim())
        || (groupDraft.responseMode === 'interval' && Number(groupDraft.intervalMinutes) > 0)
      )
    );

    if (!aiValid) return;

    if (backend.useApi) {
      chatApi.createGroup(mapGroupPayloadFromDraft(groupDraft))
        .then(async ({ group }) => {
          await backend.refreshRooms();
          setActiveRoomId(group.id);
          setBotNotice(`Grup "${group.nama}" berhasil dibuat.`);
          window.setTimeout(() => setBotNotice(''), 3000);
          handleCloseGroupBuilder();
        })
        .catch((err) => {
          setBotNotice(err.message);
          window.setTimeout(() => setBotNotice(''), 3000);
        });
      return;
    }

    const groupId = `group-${Date.now()}`;
    const memberNames = groupDraft.memberIds
      .map((id) => invitableMembers.find((member) => member.id === id)?.nama)
      .filter(Boolean);

    const group = {
      id: groupId,
      nama: groupDraft.nama.trim(),
      memberIds: [...groupDraft.memberIds],
      aiEnabled: groupDraft.aiEnabled,
      llm: groupDraft.aiEnabled ? groupDraft.llm : '',
      knowledgeFiles: groupDraft.aiEnabled ? [...groupDraft.knowledgeFiles] : [],
      tasks: groupDraft.aiEnabled ? [...groupDraft.tasks] : [],
      responseMode: groupDraft.aiEnabled ? groupDraft.responseMode : 'always',
      triggerCode: groupDraft.aiEnabled ? groupDraft.triggerCode.trim() : '',
      intervalMinutes: groupDraft.aiEnabled && groupDraft.responseMode === 'interval'
        ? Number(groupDraft.intervalMinutes)
        : null,
      lastTime: 'Baru',
    };

    setGroups((prev) => [group, ...prev]);
    setBotMessages((prev) => ({
      ...prev,
      [groupId]: [{
        id: `welcome-${groupId}`,
        sender_id: null,
        sender_role: 'ai',
        sender_name: group.aiEnabled ? 'AI Grup' : 'Sistem',
        teks_pesan: buildGroupWelcomeMessage(group, memberNames),
        created_at: new Date().toISOString(),
      }],
    }));
    setActiveRoomId(groupId);
    setBotNotice(`Grup "${group.nama}" berhasil dibuat.`);
    window.setTimeout(() => setBotNotice(''), 3000);
    handleCloseGroupBuilder();
  }

  function handleChangeName(name) {
    setCurrentUser((prev) => ({
      ...prev,
      name,
      initials: getInitials(name),
    }));
  }

  function handleChangeAvatar() {
    setCurrentUser((prev) => {
      const currentIndex = AVATAR_COLORS.indexOf(prev.avatarColor);
      const nextColor = AVATAR_COLORS[(currentIndex + 1) % AVATAR_COLORS.length];
      return { ...prev, avatarColor: nextColor };
    });
  }

  function handleAddContact(contact) {
    if (backend.useApi) {
      chatApi.createContact(mapContactPayloadFromForm({
        nama: contact.nama,
        nomorId: contact.nomorId,
        status: contact.status,
      }))
        .then(async ({ contact: saved }) => {
          await Promise.all([backend.refreshRooms(), backend.refreshContacts()]);
          setShowInviteForm(false);
          setActiveRoomId(saved.roomId ?? saved.room_id);
        })
        .catch((err) => {
          setBotNotice(err.message);
          window.setTimeout(() => setBotNotice(''), 3000);
        });
      return;
    }

    setContacts((prev) => [contact, ...prev]);
    setShowInviteForm(false);
    setActiveRoomId(`contact-${contact.id}`);
  }

  function handleOpenFaqBuilder() {
    closePanels();
    if (bots.faq.generated) {
      setFaqBotDraft({
        nama: bots.faq.nama,
        kodeId: bots.faq.kodeId,
        categories: [],
        faqs: [{ id: 'faq-1', categoryId: null, question: '', answer: '' }],
      });
    } else {
      setFaqBotDraft(createFaqBotDraft(`${botCodeCounter}-BOT`));
    }
    setShowFaqBuilder(true);
  }

  function handleOpenAiAssistant() {
    closePanels();
    if (bots.aiAssistant.generated) {
      setAiAssistantDraft({
        nama: bots.aiAssistant.nama,
        llm: bots.aiAssistant.llm,
        knowledgeFiles: [...bots.aiAssistant.knowledgeFiles],
      });
    } else {
      setAiAssistantDraft(createAiAssistantDraft());
    }
    setShowAiBuilder(true);
  }

  function handleToggleAgentOnline(agentId) {
    setBots((prev) => {
      if (agentId === 'faq' && prev.faq.generated) {
        return {
          ...prev,
          faq: { ...prev.faq, online: !prev.faq.online },
        };
      }
      if (agentId === 'ai' && prev.aiAssistant.generated) {
        return {
          ...prev,
          aiAssistant: { ...prev.aiAssistant, online: !prev.aiAssistant.online },
        };
      }
      return prev;
    });
  }

  function handleDeleteAgent(agentId) {
    if (!window.confirm('Hapus agent ini? Tindakan tidak dapat dibatalkan.')) return;

    setBots((prev) => {
      if (agentId === 'faq') {
        return { ...prev, faq: { ...DEFAULT_BOTS.faq } };
      }
      if (agentId === 'ai') {
        return { ...prev, aiAssistant: { ...DEFAULT_BOTS.aiAssistant } };
      }
      return prev;
    });

    setBotMessages((prev) => {
      const next = { ...prev };
      if (agentId === 'faq' && bots.faq.kodeId) {
        delete next[`bot-${bots.faq.kodeId}`];
      }
      if (agentId === 'ai') {
        delete next['bot-ai-assistant'];
      }
      return next;
    });

    setBotNotice('Agent berhasil dihapus.');
    window.setTimeout(() => setBotNotice(''), 3000);
  }

  function handleAddKnowledgeFiles(agentId, newFiles) {
    if (agentId !== 'ai') return;
    setBots((prev) => ({
      ...prev,
      aiAssistant: {
        ...prev.aiAssistant,
        knowledgeFiles: [...(prev.aiAssistant.knowledgeFiles ?? []), ...newFiles],
      },
    }));
  }

  function handleRemoveKnowledgeFile(agentId, fileId) {
    if (agentId !== 'ai') return;
    setBots((prev) => ({
      ...prev,
      aiAssistant: {
        ...prev.aiAssistant,
        knowledgeFiles: prev.aiAssistant.knowledgeFiles.filter((f) => f.id !== fileId),
      },
    }));
  }

  function handleCloseFaqBuilder() {
    setShowFaqBuilder(false);
    setFaqBotDraft(null);
  }

  function handleCloseAiBuilder() {
    setShowAiBuilder(false);
    setAiAssistantDraft(null);
  }

  function handleSaveFaqBot() {
    if (!faqBotDraft?.nama.trim()) return;

    if (backend.useApi) {
      chatApi.createFaqBot(mapFaqPayloadFromDraft(faqBotDraft))
        .then(async ({ bot }) => {
          await backend.refreshRooms();
          setBots((prev) => ({
            ...prev,
            faq: {
              generated: true,
              label: 'Bot FAQ',
              nama: bot.nama,
              kodeId: bot.kodeId,
              online: true,
              roomId: bot.roomId,
            },
          }));
          setActiveRoomId(bot.roomId);
          setBotNotice(`Bot FAQ "${bot.nama}" (${bot.kodeId}) berhasil disimpan.`);
          window.setTimeout(() => setBotNotice(''), 3000);
          handleCloseFaqBuilder();
        })
        .catch((err) => {
          setBotNotice(err.message);
          window.setTimeout(() => setBotNotice(''), 3000);
        });
      return;
    }

    const botName = faqBotDraft.nama.trim();
    const roomId = `bot-${faqBotDraft.kodeId}`;

    setBots((prev) => ({
      ...prev,
      faq: {
        generated: true,
        label: 'Bot FAQ',
        nama: botName,
        kodeId: faqBotDraft.kodeId,
        online: true,
        roomId,
      },
    }));
    setBotMessages((prev) => ({
      ...prev,
      [roomId]: [{
        id: `welcome-${faqBotDraft.kodeId}`,
        sender_id: null,
        sender_role: 'ai',
        sender_name: botName,
        teks_pesan: buildFaqWelcomeMessage(botName, faqBotDraft.categories),
        created_at: new Date().toISOString(),
      }],
    }));
    setBotCodeCounter((prev) => prev + 1);
    setActiveRoomId(roomId);
    setBotNotice(`Bot FAQ "${botName}" (${faqBotDraft.kodeId}) berhasil disimpan.`);
    window.setTimeout(() => setBotNotice(''), 3000);
    handleCloseFaqBuilder();
  }

  function handleSaveAiAssistant() {
    if (!aiAssistantDraft?.nama.trim() || !aiAssistantDraft.llm || !aiAssistantDraft.knowledgeFiles.length) {
      return;
    }

    if (backend.useApi) {
      chatApi.createAiAssistant(mapAiPayloadFromDraft(aiAssistantDraft))
        .then(async ({ bot }) => {
          await backend.refreshRooms();
          setBots((prev) => ({
            ...prev,
            aiAssistant: {
              generated: true,
              label: 'AI Assistant',
              nama: bot.nama,
              llm: bot.llm,
              knowledgeFiles: bot.knowledgeFiles ?? aiAssistantDraft.knowledgeFiles,
              online: true,
              roomId: bot.roomId,
            },
          }));
          setActiveRoomId(bot.roomId);
          setBotNotice(`AI Assistant "${bot.nama}" berhasil digenerate.`);
          window.setTimeout(() => setBotNotice(''), 3000);
          handleCloseAiBuilder();
        })
        .catch((err) => {
          setBotNotice(err.message);
          window.setTimeout(() => setBotNotice(''), 3000);
        });
      return;
    }

    const aiName = aiAssistantDraft.nama.trim();

    setBots((prev) => ({
      ...prev,
      aiAssistant: {
        generated: true,
        label: 'AI Assistant',
        nama: aiName,
        llm: aiAssistantDraft.llm,
        knowledgeFiles: aiAssistantDraft.knowledgeFiles,
        online: true,
        roomId: 'bot-ai-assistant',
      },
    }));
    setBotMessages((prev) => ({
      ...prev,
      'bot-ai-assistant': [{
        id: 'ai-welcome',
        sender_id: null,
        sender_role: 'ai',
        sender_name: aiName,
        teks_pesan: buildAiWelcomeMessage(
          aiName,
          aiAssistantDraft.llm,
          aiAssistantDraft.knowledgeFiles,
        ),
        created_at: new Date().toISOString(),
      }],
    }));
    setActiveRoomId('bot-ai-assistant');
    setBotNotice(`AI Assistant "${aiName}" berhasil digenerate.`);
    window.setTimeout(() => setBotNotice(''), 3000);
    handleCloseAiBuilder();
  }

  async function handleDeleteMessage(messageId) {
    if (!activeRoomId) return;

    if (backend.useApi) {
      const previousMessages = backend.messagesByRoom[activeRoomId] ?? [];
      backend.setMessagesByRoom((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] ?? []).filter((msg) => msg.id !== messageId),
      }));

      try {
        await chatApi.deleteMessage(activeRoomId, messageId);
        await backend.refreshRooms();
      } catch (err) {
        backend.setMessagesByRoom((prev) => ({
          ...prev,
          [activeRoomId]: previousMessages,
        }));
        setBotNotice(err.message || 'Gagal menghapus pesan');
        window.setTimeout(() => setBotNotice(''), 3000);
      }
      return;
    }

    setBotMessages((prev) => ({
      ...prev,
      [activeRoomId]: (prev[activeRoomId] ?? []).filter((msg) => msg.id !== messageId),
    }));
  }

  async function handleSendMessage() {
    if (!draft.trim() || !activeRoomId) return;

    const text = draft.trim();
    setDraft('');

    if (backend.useApi) {
      try {
        await chatApi.sendMessage(activeRoomId, text);
        await backend.loadMessages(activeRoomId);
        await backend.refreshRooms();
      } catch (err) {
        setBotNotice(err.message);
        window.setTimeout(() => setBotNotice(''), 3000);
        setDraft(text);
      }
      return;
    }

    setBotMessages((prev) => ({
      ...prev,
      [activeRoomId]: [
        ...(prev[activeRoomId] ?? []),
        {
          id: `local-${Date.now()}`,
          sender_id: CURRENT_USER_ID,
          sender_role: 'staff',
          sender_name: currentUser.name,
          teks_pesan: text,
          created_at: new Date().toISOString(),
        },
      ],
    }));
  }

  return (
    <div className="internal-chat-board">
      <aside className="chat-sidebar">
        <div className="chat-sidebar__header">
          <h2 className="chat-sidebar__title">Internal Chat</h2>
          <UserProfileMenu
            user={currentUser}
            role={role}
            bots={bots}
            activeRoomId={activeRoomId}
            onSelectRoom={handleSelectRoom}
            onOpenInviteForm={handleOpenInviteForm}
            onOpenGroupBuilder={handleOpenGroupBuilder}
            onChangeName={handleChangeName}
            onChangeAvatar={handleChangeAvatar}
            onOpenFaqBuilder={handleOpenFaqBuilder}
            onOpenAiAssistant={handleOpenAiAssistant}
            onToggleAgentOnline={handleToggleAgentOnline}
            onDeleteAgent={handleDeleteAgent}
            onAddKnowledgeFiles={handleAddKnowledgeFiles}
            onRemoveKnowledgeFile={handleRemoveKnowledgeFile}
          />
          {botNotice && <p className="chat-owner-notice">{botNotice}</p>}
        </div>

        <div className="chat-sidebar__scroll">
        <ul className="chat-room-list">
          {sidebarRooms.map((room) => (
            <SwipeableRoomItem
              key={room.id}
              room={room}
              isActive={room.id === activeRoomId}
              showAsBot={room.isBot && role === 'owner'}
              onSelect={handleSelectRoom}
              onDelete={handleDeleteRoom}
            />
          ))}
        </ul>
        </div>
      </aside>

      <main className="chat-main">
        {showInviteForm ? (
          <InviteFriendsForm
            onAddContact={handleAddContact}
            onClose={handleCloseInviteForm}
          />
        ) : role === 'owner' && showGroupBuilder && groupDraft ? (
          <CreateGroupBuilder
            draft={groupDraft}
            onChange={setGroupDraft}
            onSave={handleSaveGroup}
            onClose={handleCloseGroupBuilder}
            availableMembers={invitableMembers}
          />
        ) : role === 'owner' && showFaqBuilder && faqBotDraft ? (
          <FaqBotBuilder
            draft={faqBotDraft}
            onChange={setFaqBotDraft}
            onSave={handleSaveFaqBot}
            onClose={handleCloseFaqBuilder}
          />
        ) : role === 'owner' && showAiBuilder && aiAssistantDraft ? (
          <AiAssistantBuilder
            draft={aiAssistantDraft}
            onChange={setAiAssistantDraft}
            onSave={handleSaveAiAssistant}
            onClose={handleCloseAiBuilder}
          />
        ) : activeRoom ? (
          <>
            <header className="chat-main__header">
              <div
                className="chat-main__header-avatar"
                style={{ background: activeRoom.avatar }}
              >
                {activeRoom.initials}
              </div>
              <div>
                <div className="chat-main__header-name">{activeRoom.nama_room}</div>
                <div className={`chat-main__header-status${
                  activeRoom.isBot || (activeRoom.isGroup && activeRoom.aiEnabled)
                    ? ' chat-main__header-status--bot'
                    : ''
                }`}>
                  {activeRoom.isGroup
                    ? (
                      activeRoom.aiEnabled
                        ? `● AI Grup · ${formatResponseModeSummary(activeRoom.groupConfig)}`
                        : `● ${activeRoom.groupConfig?.memberIds?.length ?? 0} anggota`
                    )
                    : activeRoom.isBot
                      ? `● ${activeRoom.statusLabel} aktif`
                      : '● Online'}
                </div>
              </div>
            </header>

            <div className={`chat-messages${messageActionMode ? ' chat-messages--selection-mode' : ''}`}>
              <div className="chat-date-divider">
                <span>Hari ini</span>
              </div>
              {messages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  currentUserName={currentUser.name}
                  currentUserId="user-me"
                  selectionMode={Boolean(messageActionMode)}
                  isSelected={selectedMessageIds.has(msg.id)}
                  onHold={handleMessageHold}
                  onToggleSelect={toggleMessageSelection}
                />
              ))}
            </div>

            {holdMenu && (
              <MessageHoldMenu
                x={holdMenu.x}
                y={holdMenu.y}
                onCopy={() => startMessageCopyMode(holdMenu.messageId)}
                onDelete={() => startMessageDeleteMode(holdMenu.messageId)}
                onClose={() => setHoldMenu(null)}
              />
            )}

            {messageActionMode ? (
              <MessageSelectionBar
                mode={messageActionMode}
                count={selectedMessageIds.size}
                onCancel={cancelMessageAction}
                onConfirm={messageActionMode === 'copy'
                  ? handleConfirmCopyMessages
                  : handleConfirmDeleteMessages}
              />
            ) : (
            <div className="chat-input-area">
              <textarea
                className="chat-input-area__field"
                placeholder="Ketik pesan..."
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="button"
                className="chat-input-area__send"
                disabled={!draft.trim()}
                onClick={handleSendMessage}
                aria-label="Kirim pesan"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            )}
          </>
        ) : (
          <div className="chat-empty">Pilih ruangan untuk memulai obrolan</div>
        )}
      </main>
    </div>
  );
}
