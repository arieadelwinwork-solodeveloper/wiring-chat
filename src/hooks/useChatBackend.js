import { useCallback, useEffect, useState } from 'react';
import { chatApi } from '../services/chatApi.js';

export function useChatBackend(role) {
  const [useApi, setUseApi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [ownerBots, setOwnerBots] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [invitableMembers, setInvitableMembers] = useState([]);
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [error, setError] = useState(null);

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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!chatApi.isEnabled()) {
        setUseApi(false);
        setLoading(false);
        return;
      }

      try {
        await chatApi.health();
        if (cancelled) return;

        const me = await chatApi.getProfile();
        if (cancelled) return;

        setProfile(me);
        setUseApi(true);
        await Promise.all([refreshRooms(), refreshContacts()]);
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
  }, [role, refreshRooms, refreshContacts]);

  const loadMessages = useCallback(async (roomId) => {
    if (!useApi) return;
    const data = await chatApi.getMessages(roomId);
    setMessagesByRoom((prev) => ({ ...prev, [roomId]: data.messages ?? [] }));
  }, [useApi]);

  return {
    useApi,
    loading,
    error,
    profile,
    rooms,
    ownerBots,
    contacts,
    invitableMembers,
    messagesByRoom,
    refreshRooms,
    refreshContacts,
    loadMessages,
    setMessagesByRoom,
  };
}
