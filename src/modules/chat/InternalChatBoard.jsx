import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
import ProfileSettingsPanel from './ProfileSettingsPanel';
import './ProfileSettingsPanel.css';
import UserAvatar from './UserAvatar';
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
import { formatMessagesForCopy, groupMessagesByDate } from './messageFormat';
import { MessageListSkeleton, RoomListSkeleton } from './ChatSkeleton';
import './ChatSkeleton.css';
import './InternalChatBoard.css';
import ConfirmModal from '../../components/ConfirmModal';
import ConnectionBanner from '../../components/ConnectionBanner';
import { useChatBackend } from '../../hooks/useChatBackend';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getOrCreateLocalNomorId } from '../../lib/nomorId';
import {
  chatApi,
  isNetworkErrorMessage,
  mapAiPayloadFromDraft,
  mapContactPayloadFromForm,
  mapFaqPayloadFromDraft,
  mapGroupPayloadFromDraft,
} from '../../services/chatApi';
const CURRENT_USER_ID = 'user-me';

const DEFAULT_USER = {
  name: 'Pengguna',
  avatarColor: '#0a2540',
  avatarUrl: null,
  initials: 'PG',
  nomorId: null,
};

const LOCAL_PROFILE_KEY = 'wiring_local_profile';

function loadLocalProfile() {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalProfile(profile) {
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
}

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
  onOpenProfileSettings,
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

  function handleOpenProfile() {
    setOpen(false);
    onOpenProfileSettings();
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
        <UserAvatar user={user} className="chat-user-profile__avatar" />
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
          <button type="button" className="chat-user-menu__item" role="menuitem" onClick={handleOpenProfile}>
            Ubah profil
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

export default function InternalChatBoard({
  role: defaultRole = 'user',
  initialRoomId = null,
  onRoomChange,
}) {
  const backend = useChatBackend(defaultRole);
  const { isOnline } = useNetworkStatus();
  const role = backend.profile?.role ?? defaultRole;
  const deepLinkHandledRef = useRef(false);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [draft, setDraft] = useState('');
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER);
  const [bots, setBots] = useState(DEFAULT_BOTS);
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [botCodeCounter, setBotCodeCounter] = useState(1);
  const [faqBotDraft, setFaqBotDraft] = useState(null);
  const [showFaqBuilder, setShowFaqBuilder] = useState(false);
  const [aiAssistantDraft, setAiAssistantDraft] = useState(null);
  const [showAiBuilder, setShowAiBuilder] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
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
        avatarUrl: backend.profile.avatarUrl ?? null,
        initials: backend.profile.initials ?? getInitials(backend.profile.name),
        nomorId: backend.profile.nomorId ?? null,
      });
      return;
    }

    if (!backend.useApi) {
      const local = loadLocalProfile();
      setCurrentUser((prev) => ({
        ...prev,
        ...(local ?? {}),
        nomorId: getOrCreateLocalNomorId(),
        initials: getInitials(local?.name ?? prev.name),
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

  const activeRoom = chatRooms.find((room) => room.id === activeRoomId);
  const messages = backend.useApi
    ? (backend.messagesByRoom[activeRoomId] ?? [])
    : (botMessages[activeRoomId] ?? []);

  const messagesLoading = backend.useApi
    && activeRoomId
    && backend.messagesLoadingRoomId === activeRoomId;

  const messageGroups = useMemo(
    () => groupMessagesByDate(messages),
    [messages],
  );

  useDocumentTitle(activeRoom ? `${activeRoom.nama_room} · Wiring` : 'Chat · Wiring');

  function showNotice(text, type = 'success') {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setNotice({ text, type });
    const delay = type === 'error' ? 8000 : 3000;
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, delay);
  }

  function dismissNotice() {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setNotice(null);
  }

  useEffect(() => {
    if (initialRoomId) return;

    deepLinkHandledRef.current = false;
    setActiveRoomId(null);
    setMobileShowChat(false);
  }, [initialRoomId]);

  useEffect(() => {
    if (!chatRooms.length) {
      if (activeRoomId && !initialRoomId) {
        setActiveRoomId(null);
        setMobileShowChat(false);
      }
      return;
    }

    if (initialRoomId && !deepLinkHandledRef.current && !backend.loading) {
      deepLinkHandledRef.current = true;
      const targetRoom = chatRooms.find((room) => room.id === initialRoomId);
      if (targetRoom) {
        setActiveRoomId(initialRoomId);
        setMobileShowChat(true);
        return;
      }

      setActiveRoomId(null);
      setMobileShowChat(false);
      showNotice('Percakapan tidak ditemukan atau Anda tidak memiliki akses.', 'error');
      onRoomChange?.(null);
      return;
    }

    if (!initialRoomId && activeRoomId && !chatRooms.find((room) => room.id === activeRoomId)) {
      setActiveRoomId(null);
      setMobileShowChat(false);
      onRoomChange?.(null);
    }
  }, [chatRooms, activeRoomId, initialRoomId, backend.loading, onRoomChange]);

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
      showNotice(`${selected.length} pesan disalin.`);
    } catch {
      showNotice('Gagal menyalin pesan.', 'error');
    }

    cancelMessageAction();
  }

  function handleConfirmDeleteMessages() {
    const ids = [...selectedMessageIds];
    if (!ids.length) return;

    setConfirmDialog({
      title: 'Hapus pesan?',
      message: `Hapus ${ids.length} pesan? Tindakan tidak dapat dibatalkan.`,
      danger: true,
      confirmLabel: 'Hapus',
      onConfirm: async () => {
        setConfirmDialog(null);
        await Promise.all(ids.map((id) => handleDeleteMessage(id)));
        cancelMessageAction();
        showNotice(`${ids.length} pesan dihapus.`);
      },
    });
  }

  function closePanels() {
    setShowFaqBuilder(false);
    setShowAiBuilder(false);
    setShowInviteForm(false);
    setShowProfileSettings(false);
    setShowGroupBuilder(false);
    setFaqBotDraft(null);
    setAiAssistantDraft(null);
    setGroupDraft(null);
  }

  function handleSelectRoom(roomId) {
    closePanels();
    cancelMessageAction();
    setActiveRoomId(roomId);
    setMobileShowChat(true);
    onRoomChange?.(roomId);
  }

  function handleMobileBack() {
    setMobileShowChat(false);
    cancelMessageAction();
    setActiveRoomId(null);
    onRoomChange?.(null);
  }

  function requestDeleteRoom(roomId) {
    const room = sidebarRooms.find((item) => item.id === roomId);
    setConfirmDialog({
      title: 'Hapus percakapan?',
      message: room
        ? `Hapus "${room.nama_room}" dari daftar?`
        : 'Hapus percakapan ini dari daftar?',
      danger: true,
      confirmLabel: 'Hapus',
      onConfirm: () => {
        handleDeleteRoom(roomId);
        setConfirmDialog(null);
        if (activeRoomId === roomId) {
          setMobileShowChat(false);
        }
      },
    });
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
      setActiveRoomId(null);
      setMobileShowChat(false);
      onRoomChange?.(null);
    }
  }

  function handleOpenInviteForm() {
    closePanels();
    setShowInviteForm(true);
    setMobileShowChat(true);
  }

  function handleCloseInviteForm() {
    setShowInviteForm(false);
    setMobileShowChat(Boolean(activeRoomId));
  }

  function handleOpenProfileSettings() {
    closePanels();
    setShowProfileSettings(true);
    setMobileShowChat(true);
  }

  function handleCloseProfileSettings() {
    setShowProfileSettings(false);
    setMobileShowChat(Boolean(activeRoomId));
  }

  async function handleSaveProfile({ name, avatarColor, imageData, removePhoto }) {
    setProfileSaving(true);

    const nextUser = {
      ...currentUser,
      name,
      avatarColor,
      initials: getInitials(name),
      avatarUrl: removePhoto ? null : (imageData ?? currentUser.avatarUrl),
    };

    try {
      if (backend.useApi) {
        if (imageData) {
          await chatApi.uploadAvatar(imageData);
        }

        const patch = {
          display_name: name,
          avatar_color: avatarColor,
        };
        if (removePhoto && !imageData) {
          patch.avatar_url = '';
        }

        const updated = await backend.updateProfile(patch);
        nextUser.avatarUrl = updated.avatarUrl ?? null;
        nextUser.name = updated.name ?? name;
        nextUser.initials = updated.initials ?? getInitials(name);
        nextUser.avatarColor = updated.avatarColor ?? avatarColor;
      } else {
        saveLocalProfile({
          name: nextUser.name,
          avatarColor: nextUser.avatarColor,
          avatarUrl: nextUser.avatarUrl,
        });
      }

      setCurrentUser(nextUser);
      setShowProfileSettings(false);
      showNotice('Profil berhasil disimpan.');
    } catch (err) {
      showNotice(err.message || 'Gagal menyimpan profil', 'error');
    } finally {
      setProfileSaving(false);
    }
  }

  function handleOpenGroupBuilder() {
    closePanels();
    setGroupDraft(createGroupDraft());
    setShowGroupBuilder(true);
    setMobileShowChat(true);
  }

  function handleCloseGroupBuilder() {
    setShowGroupBuilder(false);
    setGroupDraft(null);
    setMobileShowChat(Boolean(activeRoomId));
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
          showNotice(`Grup "${group.nama}" berhasil dibuat.`);
          handleCloseGroupBuilder();
        })
        .catch((err) => {
          showNotice(err.message, 'error');
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
    showNotice(`Grup "${group.nama}" berhasil dibuat.`);
    handleCloseGroupBuilder();
  }

  function findRoomByNomorId(nomorId) {
    const normalized = nomorId.trim().toUpperCase();
    const rooms = backend.useApi ? backend.rooms : contactRooms;
    return rooms.find(
      (room) => room.isContact && room.nomorId?.toUpperCase() === normalized,
    );
  }

  function openChatRoom(roomId) {
    setShowInviteForm(false);
    setActiveRoomId(roomId);
    if (backend.useApi && roomId) {
      backend.loadMessages(roomId);
    }
  }

  async function handleAddContact(contact) {
    const existingRoom = findRoomByNomorId(contact.nomorId);
    if (existingRoom) {
      openChatRoom(existingRoom.id);
      return;
    }

    if (backend.useApi) {
      try {
        const { contact: saved } = await chatApi.createContact(mapContactPayloadFromForm({
          nama: contact.nama,
          nomorId: contact.nomorId,
          status: contact.status,
        }));
        await Promise.all([backend.refreshRooms(), backend.refreshContacts()]);
        const roomId = saved.roomId ?? saved.room_id;
        openChatRoom(roomId);
      } catch (err) {
        showNotice(err.message, 'error');
        throw err;
      }
      return;
    }

    setContacts((prev) => [contact, ...prev]);
    openChatRoom(`contact-${contact.id}`);
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
    setMobileShowChat(true);
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
    setMobileShowChat(true);
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

  function requestDeleteAgent(agentId) {
    const label = agentId === 'faq' ? 'Bot FAQ' : 'AI Assistant';
    setConfirmDialog({
      title: 'Hapus agent?',
      message: `Hapus ${label}? Tindakan tidak dapat dibatalkan.`,
      danger: true,
      confirmLabel: 'Hapus',
      onConfirm: () => {
        executeDeleteAgent(agentId);
        setConfirmDialog(null);
      },
    });
  }

  function executeDeleteAgent(agentId) {
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

    showNotice('Agent berhasil dihapus.');
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
    setMobileShowChat(Boolean(activeRoomId));
  }

  function handleCloseAiBuilder() {
    setShowAiBuilder(false);
    setAiAssistantDraft(null);
    setMobileShowChat(Boolean(activeRoomId));
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
          showNotice(`Bot FAQ "${bot.nama}" (${bot.kodeId}) berhasil disimpan.`);
          handleCloseFaqBuilder();
        })
        .catch((err) => {
          showNotice(err.message, 'error');
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
    showNotice(`Bot FAQ "${botName}" (${faqBotDraft.kodeId}) berhasil disimpan.`);
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
          showNotice(`AI Assistant "${bot.nama}" berhasil digenerate.`);
          handleCloseAiBuilder();
        })
        .catch((err) => {
          showNotice(err.message, 'error');
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
    showNotice(`AI Assistant "${aiName}" berhasil digenerate.`);
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
        showNotice(err.message || 'Gagal menghapus pesan', 'error');
      }
      return;
    }

    setBotMessages((prev) => ({
      ...prev,
      [activeRoomId]: (prev[activeRoomId] ?? []).filter((msg) => msg.id !== messageId),
    }));
  }

  async function handleSendMessage() {
    if (!draft.trim() || !activeRoomId || sendingMessage) return;

    if (backend.useApi && !isOnline) {
      showNotice('Tidak ada koneksi internet. Pesan tidak dapat dikirim.', 'error');
      return;
    }

    const text = draft.trim();
    setDraft('');
    setSendingMessage(true);

    if (backend.useApi) {
      try {
        await chatApi.sendMessage(activeRoomId, text);
        await backend.loadMessages(activeRoomId);
        await backend.refreshRooms();
      } catch (err) {
        showNotice(err.message, 'error');
        setDraft(text);
      } finally {
        setSendingMessage(false);
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
    setSendingMessage(false);
  }

  function handleDraftKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  const mobileShowDetail = mobileShowChat
    || showProfileSettings
    || showInviteForm
    || showGroupBuilder
    || showFaqBuilder
    || showAiBuilder;

  const showOfflineBanner = chatApi.isEnabled() && !isOnline;

  const connectionErrorMessage = backend.fetchError
    ?? ((!backend.useApi && backend.error) ? backend.error : null);

  const showConnectionRetryBanner = chatApi.isEnabled()
    && isOnline
    && connectionErrorMessage
    && isNetworkErrorMessage(connectionErrorMessage);

  const showLocalFallbackBanner = Boolean(
    backend.error
    && !isNetworkErrorMessage(backend.error)
    && !backend.useApi
    && !backend.loading,
  );

  async function handleConnectionRetry() {
    const ok = await backend.retryConnection(activeRoomId);
    if (ok) {
      backend.clearFetchError();
      showNotice('Koneksi dipulihkan.');
      return;
    }

    const message = backend.error ?? backend.fetchError;
    if (message) {
      showNotice(message, 'error');
    }
  }

  return (
    <div className={`internal-chat-board${mobileShowDetail ? ' internal-chat-board--room-open' : ''}`}>
      {showOfflineBanner && (
        <ConnectionBanner mode="offline" canRetry={false} />
      )}

      {showConnectionRetryBanner && (
        <ConnectionBanner
          mode="error"
          message={connectionErrorMessage}
          onRetry={handleConnectionRetry}
          retrying={backend.retrying}
        />
      )}

      {showLocalFallbackBanner && (
        <div className="chat-board-banner chat-board-banner--error" role="alert">
          <span>{backend.error}</span>
          <span className="chat-board-banner__hint">Menggunakan mode lokal.</span>
        </div>
      )}

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
            onOpenProfileSettings={handleOpenProfileSettings}
            onOpenFaqBuilder={handleOpenFaqBuilder}
            onOpenAiAssistant={handleOpenAiAssistant}
            onToggleAgentOnline={handleToggleAgentOnline}
            onDeleteAgent={requestDeleteAgent}
            onAddKnowledgeFiles={handleAddKnowledgeFiles}
            onRemoveKnowledgeFile={handleRemoveKnowledgeFile}
          />
          {notice && (
            <p className={`chat-owner-notice${notice.type === 'error' ? ' chat-owner-notice--error' : ''}`}>
              <span>{notice.text}</span>
              {notice.type === 'error' && (
                <button type="button" className="chat-owner-notice__dismiss" onClick={dismissNotice}>
                  Tutup
                </button>
              )}
            </p>
          )}
        </div>

        <div className="chat-sidebar__scroll">
        {backend.loading ? (
          <RoomListSkeleton />
        ) : sidebarRooms.length === 0 ? (
          <div className="chat-sidebar-empty">
            <p>Belum ada percakapan.</p>
            {role === 'owner' ? (
              <button type="button" className="chat-sidebar-empty__cta" onClick={handleOpenInviteForm}>
                Mulai percakapan
              </button>
            ) : (
              <p className="chat-sidebar-empty__hint">Undang teman atau tunggu undangan dari owner.</p>
            )}
          </div>
        ) : (
        <ul className="chat-room-list">
          {sidebarRooms.map((room) => (
            <SwipeableRoomItem
              key={room.id}
              room={room}
              isActive={room.id === activeRoomId}
              showAsBot={room.isBot && role === 'owner'}
              onSelect={handleSelectRoom}
              onDelete={requestDeleteRoom}
            />
          ))}
        </ul>
        )}
        </div>
      </aside>

      <main className="chat-main">
        {showProfileSettings ? (
          <ProfileSettingsPanel
            user={currentUser}
            saving={profileSaving}
            onSave={handleSaveProfile}
            onClose={handleCloseProfileSettings}
          />
        ) : showInviteForm ? (
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
              <button
                type="button"
                className="chat-main__back"
                onClick={handleMobileBack}
                aria-label="Kembali ke daftar percakapan"
              >
                ‹
              </button>
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
              {messagesLoading ? (
                <MessageListSkeleton />
              ) : messages.length === 0 ? (
                <div className="chat-messages-empty">Belum ada pesan — kirim sapaan pertama.</div>
              ) : (
                messageGroups.map((group) => (
                  <Fragment key={group.dateKey}>
                    <div className="chat-date-divider">
                      <span>{group.dateLabel}</span>
                    </div>
                    {group.messages.map((msg) => (
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
                  </Fragment>
                ))
              )}
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
                onKeyDown={handleDraftKeyDown}
                disabled={sendingMessage || (backend.useApi && !isOnline)}
              />
              <button
                type="button"
                className="chat-input-area__send"
                disabled={!draft.trim() || sendingMessage || (backend.useApi && !isOnline)}
                onClick={handleSendMessage}
                aria-label="Kirim pesan"
              >
                {sendingMessage ? (
                  <span className="chat-input-area__spinner" aria-hidden />
                ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
                )}
              </button>
            </div>
            )}
          </>
        ) : (
          <div className="chat-empty">Pilih ruangan untuk memulai obrolan</div>
        )}
      </main>

      <ConfirmModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message}
        danger={confirmDialog?.danger}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={() => confirmDialog?.onConfirm?.()}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
