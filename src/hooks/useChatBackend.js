import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi } from '../services/chatApi.js';

export function useChatBackend(role) {
  const [useApi, setUseApi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [profile, setProfile] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [ownerBots, setOwnerBots] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [invitableMembers, setInvitableMembers] = useState([]);
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [messagesLoadingRoomId, setMessagesLoadingRoomId] = useState(null);
  const [error, setError] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const loadedRoomIdsRef = useRef(new Set());

  const refreshRooms = useCallback(async () => {
    const data = await chatApi.getRooms();
    setRooms(data.rooms ?? []);
    setOwnerBots(data.ownerBots ?? []);
  }, []);

  const refreshContacts = useCallback(async () => {
    const [contactsRes, invitableRes] = await Promise.all([
      chatApi.getContacts(),
      chatApi.getInvitableMembers(),
    ]);
    setContacts((contactsRes.contacts ?? []).map((c) => ({
      id: c.id,
      nama: c.nama,
      nomorId: c.nomorId ?? c.nomor_id,
      status: c.status,
    })));
    setInvitableMembers(invitableRes.members ?? []);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const data = await chatApi.updateProfile(updates);
    setProfile(data);
    return data;
  }, []);

  const bootstrapApi = useCallback(async () => {
    await chatApi.health();
    const me = await chatApi.getProfile();
    setProfile(me);
    setUseApi(true);
    setError(null);
    setFetchError(null);
    await Promise.all([refreshRooms(), refreshContacts()]);
    return me;
  }, [refreshRooms, refreshContacts]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!chatApi.isEnabled()) {
        setUseApi(false);
        setLoading(false);
        return;
      }

      try {
        await bootstrapApi();
      } catch (err) {
        if (!cancelled) {
          setUseApi(false);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [role, bootstrapApi]);

  const loadMessages = useCallback(async (roomId) => {
    if (!useApi || !roomId) return;

    const isFirstLoad = !loadedRoomIdsRef.current.has(roomId);
    if (isFirstLoad) {
      setMessagesLoadingRoomId(roomId);
    }

    try {
      const data = await chatApi.getMessages(roomId);
      setMessagesByRoom((prev) => ({ ...prev, [roomId]: data.messages ?? [] }));
      loadedRoomIdsRef.current.add(roomId);
      setFetchError(null);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      if (isFirstLoad) {
        setMessagesLoadingRoomId((current) => (current === roomId ? null : current));
      }
    }
  }, [useApi]);

  const retryConnection = useCallback(async (activeRoomId) => {
    if (!chatApi.isEnabled()) return false;

    setRetrying(true);
    setError(null);
    setFetchError(null);

    try {
      await bootstrapApi();

      if (activeRoomId) {
        loadedRoomIdsRef.current.delete(activeRoomId);
        setMessagesLoadingRoomId(activeRoomId);
        try {
          const data = await chatApi.getMessages(activeRoomId);
          setMessagesByRoom((prev) => ({ ...prev, [activeRoomId]: data.messages ?? [] }));
          loadedRoomIdsRef.current.add(activeRoomId);
        } catch (err) {
          setFetchError(err.message);
        } finally {
          setMessagesLoadingRoomId(null);
        }
      }

      return true;
    } catch (err) {
      setUseApi(false);
      setError(err.message);
      return false;
    } finally {
      setRetrying(false);
      setLoading(false);
    }
  }, [bootstrapApi]);

  const clearFetchError = useCallback(() => {
    setFetchError(null);
  }, []);

  return {
    useApi,
    loading,
    retrying,
    error,
    fetchError,
    profile,
    rooms,
    ownerBots,
    contacts,
    invitableMembers,
    messagesByRoom,
    messagesLoadingRoomId,
    refreshRooms,
    refreshContacts,
    updateProfile,
    loadMessages,
    retryConnection,
    clearFetchError,
    setMessagesByRoom,
  };
}
