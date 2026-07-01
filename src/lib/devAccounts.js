export const DEV_ACCOUNTS = [
  {
    id: 'owner',
    label: 'Owner',
    email: 'owner@wiring.test',
    password: 'WiringOwner123!',
    hint: 'Grup, bot, undang teman',
  },
  {
    id: 'user',
    label: 'User',
    email: 'user@wiring.test',
    password: 'WiringUser123!',
    hint: 'Chat kontak & bot',
  },
];

/** Hanya tampil saat `npm run dev` — jangan dipakai di production. */
export const showDevLogin = import.meta.env.DEV;
