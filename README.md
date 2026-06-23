# Wiring

Modular app shell dengan modul **Internal Chat** (React + Vite). Backend direncanakan: Node.js + Express + Supabase.

## Menjalankan

### Frontend + Backend API (lokal)

```bash
npm install
cp .env.example .env
npm run dev:server   # terminal 1 — API http://localhost:3001
npm run dev          # terminal 2 — UI http://localhost:5173
```

Data chat berasal dari API/Supabase — tidak ada data dummy bawaan.

### Production Supabase

1. Jalankan `chat_schema.sql` di Supabase SQL Editor
2. Isi `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` di `.env`
3. Set `DEV_BYPASS_AUTH=false`

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/profile/me` | Profil pengguna |
| PATCH | `/api/profile/me` | Update nama/avatar |
| GET | `/api/contacts` | Daftar kontak |
| GET | `/api/contacts/invitable` | Anggota untuk undang group |
| POST | `/api/contacts` | Mengundang teman |
| GET | `/api/rooms` | Sidebar rooms + owner bots |
| GET | `/api/rooms/:id/messages` | Pesan ruangan |
| POST | `/api/rooms/:id/messages` | Kirim pesan |
| POST | `/api/groups` | Buat group (owner) |
| POST | `/api/bots/faq` | Generate Bot FAQ (owner) |
| POST | `/api/bots/ai-assistant` | Generate AI Assistant (owner) |
| POST | `/api/chat` | AI chat (rate limited) |


Buka http://localhost:5173 — toggle **User** / **Owner** untuk preview peran.

## Struktur

```
Wiring/
├── docs/
│   └── Security_PRD_Origami_OLaundry.md
├── server/                    # Express API (Node.js)
│   ├── index.js
│   ├── app.js
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── schemas/
├── chat_schema.sql
├── src/
│   ├── services/chatApi.js    # Frontend API client
│   ├── hooks/useChatBackend.js
│   └── modules/chat/
└── .cursor/rules/
```

## Modul Chat

- Sidebar: kontak, grup, bot/AI (role-based)
- Owner: generate Bot FAQ, AI Assistant, buat group, undang teman
- User: kontak + bot sebagai chat biasa, undang teman
- Skema DB: `chat_schema.sql` (RLS + Realtime)

## Keamanan Backend

Semua kode backend, API, Supabase, dan auth **wajib** mengikuti:

**[docs/Security_PRD_Origami_OLaundry.md](docs/Security_PRD_Origami_OLaundry.md)**

Ringkasan:

- Security by default — deny all, allow specific
- Secrets di `.env` saja, tidak di frontend
- Supabase Auth + RLS di setiap tabel
- Validasi input (Zod), rate limiting, Helmet.js
- AI calls hanya lewat backend + prompt injection defense

Cursor AI otomatis menerapkan rule ini saat mengerjakan file SQL, server, API, atau middleware (lihat `.cursor/rules/backend-security.mdc`).

## Perintah ke Cursor (backend baru)

```
Baca docs/Security_PRD_Origami_OLaundry.md dan terapkan semua requirement-nya
saat generate code. Jika ada konflik dengan fitur yang aku minta, prioritaskan security.
```
