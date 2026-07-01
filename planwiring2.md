# Wiring — Plan Deploy Production (100%)

> **Dokumen:** `planwiring2.md` — gate akhir sebelum production  
> **Gabungan dari:** `planwiring.md` · `docs/Security_PRD_Origami_OLaundry.md` · Prelaunch Full - Production  
> **Tanggal:** Juli 2026  
> **Target:** Semua item `[ ]` selesai → **layak deploy & launch public**

---

## Cara Pakai

1. Kerjakan per **Fase** (A → E). Jangan deploy jika masih ada item **Blocker**.
2. Centang `[x]` setelah selesai + diverifikasi.
3. Item bertanda **(manual)** wajib dicoba di browser/device nyata.
4. Jalankan `npm run smoke:test` + `npm run build` setelah tiap fase besar.

**Perintah ke AI:**

> Baca `planwiring2.md` dan kerjakan Fase [X]. Centang item yang selesai. Prioritaskan Blocker dan Security.

---

## Definisi Siap Deploy

| Level | Syarat |
|-------|--------|
| **Layak deploy** | Semua Fase A + B PASS · skor ≥ 80% · tidak ada console error · uji Chrome desktop + mobile |
| **Layak launch public** | Semua fase A–E PASS · skor **100%** · uji 4 browser · 3 ukuran layar (360 / 768 / 1280+) |

### Skor (update manual)

| Metrik | Nilai |
|--------|-------|
| Total item | 148 |
| Selesai `[x]` | 98 |
| Sebagian `[~]` | 6 |
| Belum `[ ]` | 44 |
| **Skor** | **69%** → target **100%** |

---

## Fase A — Blocker (wajib sebelum deploy)

Item yang status **FAIL** dari review Prelaunch — tidak boleh ada yang terbuka.

### A1. Uji manual lintas perangkat **(manual)**

- [ ] Chrome desktop — login → daftar chat → buka room → kirim → logout
- [ ] Chrome mobile (375px) — flow sama + swipe/hold
- [ ] Safari iOS atau Safari Mac — smoke auth + chat
- [ ] Firefox — smoke auth + chat
- [ ] Android Chrome (~360px) — layout tidak pecah

### A2. Form & aksesibilitas

- [x] **I7** Error validasi **di bawah field** (login, register, forgot, reset) — bukan hanya di atas form
- [x] **I7** `htmlFor` + `id` pada semua label/input auth (login, register, forgot, reset)
- [ ] **I7** `htmlFor` + `id` pada builders utama (CreateGroup, FaqBot, AiAssistant) — Fase D
- [x] **I7** `aria-describedby` menghubungkan error ke field yang salah (auth forms)
- [x] **a11y** Avatar foto: `alt` deskriptif + `aria-label` inisial

### A3. Performa bundle

- [x] Code-split route berat (`React.lazy`: Internal Chat, Reset, Verify, 404) + manual chunks vendor
- [x] Entry chunk utama **~13 KB gzip** (index); vendor-react terpisah **~129 KB gzip**
- [ ] Verifikasi FCP < 3 detik di throttling 4G **(manual)** DevTools

### A4. AI UX (Wiring)

- [x] Indikator **“AI memproses…”** saat bot FAQ / AI grup merespons
- [x] ~~Response AI streaming~~ — **N/A Wiring v1**
- [x] Batas panjang input pesan (backend Zod max 10.000 karakter)
- [x] Sanitasi output AI (`validateAIOutput`) + render pesan (`DOMPurify`)

### A5. Navigasi pasca-login

- [x] Login selalu ke `/chat` (daftar Internal Chat), tidak restore deep link lama
- [x] Tidak auto-buka room pertama — user pilih dari daftar
- [x] Panel chat tersembunyi sampai room dipilih (desktop & mobile)

---

## Fase B — Security PRD (17 item wajib)

Referensi: `docs/Security_PRD_Origami_OLaundry.md`

### B1. Secrets & repo

- [x] `.env` ada di `.gitignore`
- [ ] Verifikasi `.env` **tidak** ada di GitHub **(manual)** cek repo remote
- [x] Tidak ada API key hardcoded (`sk-`, service key) di kode sumber
- [ ] `git check-ignore -v .env` lulus **(manual)**

### B2. Auth & API

- [x] Auth middleware + JWT Supabase di semua route protected
- [x] `DEV_BYPASS_AUTH=false` di production (`server/config/env.js` guard)
- [ ] Production server: `DEV_BYPASS_AUTH` tidak diset `true` **(manual)** Render/Railway
- [x] Handler 401 global → signOut + redirect login
- [x] Rate limiting global + AI endpoint (`server/app.js`)
- [x] Helmet.js + CSP
- [x] CORS hanya origin terdaftar
- [x] Body limit 10 MB

### B3. Data & input

- [x] Query parameterized (Supabase client)
- [x] Zod validation POST/PUT
- [x] Error generik ke user (`handleDatabaseError`, `errorHandler`)
- [x] DOMPurify frontend (`src/lib/sanitize.js`)
- [x] Sanitasi plain text backend (`server/lib/sanitize.js` + schema)
- [x] Prompt injection filter (`filterPromptInjection`)
- [x] System prompt terpisah, tanpa secret di prompt
- [x] `validateAIOutput` diperkuat (API key / JWT pattern)

### B4. Supabase RLS **(manual di dashboard)**

- [ ] RLS **enabled** di semua tabel: `user_profiles`, `chat_rooms`, `chat_room_members`, `messages`, `contacts`, `chat_bots`
- [ ] Policy SELECT/INSERT/UPDATE/DELETE sesuai `auth.uid()` — review `chat_schema.sql`
- [ ] Trigger `handle_new_user` jalan di production (signup tidak error)

### B5. Frontend security

- [x] Tidak ada panggilan Deepseek/Anthropic langsung dari browser
- [x] Tidak ada `innerHTML` / `eval` dengan input user
- [~] File upload avatar: validasi format di frontend — perkuat pesan error ke user
- [x] Protected routes — incognito tanpa login redirect ke `/login`
- [x] Dev login cards hanya `import.meta.env.DEV` (tidak di production build)

### B6. Security quick test

- [ ] `npm audit` — 0 vulnerability critical/high **(manual)**
- [ ] XSS test: `<script>alert('x')</script>` di chat & nama profil tidak execute **(manual)**
- [ ] Prompt injection test: `ignore previous instructions` → 400 **(manual)**
- [ ] Response headers security (Helmet) terlihat di Network tab **(manual)**

---

## Fase C — Prelaunch Production (7 kategori)

### C1. UI/UX completeness

#### User flow
- [x] Journey auth lengkap (login, register, forgot, reset, verify email)
- [x] Owner & user chat flow lengkap
- [x] Tidak ada dead end — back/cancel di builders & mobile chat
- [ ] Breadcrumb atau indikator posisi di flow dalam (profil, builders) — **N1**

#### State coverage (per fitur utama)
- [x] Loading — auth, chat rooms, messages (skeleton)
- [x] Empty — sidebar, pesan, room belum dipilih
- [x] Error — banner API, form error, connection retry
- [~] Success — `botNotice` ada; belum toast terpusat **R10**
- [x] Disabled — submit saat loading, kirim saat draft kosong

#### Form & input
- [x] Asterisk (*) field wajib — login + builders
- [x] Placeholder & hint (nomor ID, password min 8)
- [ ] Error di bawah field — lihat Fase A2
- [x] `inputMode="email"` di login
- [x] Submit disabled saat proses

#### Feedback & konfirmasi
- [x] Loading setelah klik aksi utama
- [~] Pesan sukses — notice chat; auth pakai banner hijau (belum toast global)
- [~] Pesan error spesifik — auth baik; beberapa API masih generik
- [x] Konfirmasi destruktif — logout, hapus room, hapus pesan, hapus agent
- [x] Anti double-submit

#### Konsistensi
- [x] Design tokens (`src/styles/tokens.css`)
- [x] Komponen `Button`, `Modal`, `ConfirmModal`
- [~] Terminologi — "Email" sudah; "O'Apps" vs Google OAuth belum dijelaskan **C2**
- [~] Waktu sidebar — real dari API; memory mode masih contoh `10:32` **C5**

### C2. Responsiveness & accessibility

- [x] Layout 375px — master-detail chat
- [x] Layout 768px — usable
- [~] Touch target 44×44px — sebagian CSS; audit penuh **M9 (manual)**
- [x] Form login tidak terpotong 320–400px
- [ ] Safe area notch — verifikasi iPhone **M7 (manual)**
- [ ] Test landscape **M8 (manual)**
- [ ] Contrast ratio 4.5:1 audit **(manual)**
- [ ] Tab order keyboard logis di login + chat **(manual)**

### C3. Performance

- [ ] Bundle code-split — lihat A3
- [x] Avatar upload max 500 KB (`resizeImage` / server)
- [~] Gambar WebP — belum wajib; avatar base64 via API
- [x] Font system — tidak FOIT
- [ ] Tidak ada console error di DevTools **(manual)**
- [ ] Tidak ada request 404/500 saat happy path **(manual)**
- [x] Tidak ada infinite loop fetch kamar/pesan
- [~] Cache data stabil — belum React Query/SWR; refresh on action saja

### C4. Security frontend

- [x] Lihat Fase B (overlap)
- [x] Token tidak di URL setelah auth (clear auth params)
- [x] Filter data per user di backend

### C5. Content & copy

- [x] Tidak ada Lorem / TODO / DUMMY di UI production
- [ ] Proofread typo seluruh halaman **(manual)**
- [x] Bahasa Indonesia konsisten
- [x] Tanggal chat adaptif (`groupMessagesByDate`)
- [x] Empty state actionable
- [x] Tidak tampilkan error teknis (SQL, stack) ke user

### C6. AI-specific (Wiring)

- [x] System prompt tanpa API key
- [ ] Streaming response — **ditunda v1** (catat N/A atau implementasi v2)
- [ ] Loading indicator AI response — lihat A4
- [x] Max input length
- [x] Sanitize render pesan & output AI
- [~] Tool access per agent — owner bots terpisah; belum `agentTools` map formal
- [~] Error AI generik ke user — demo fallback ada; perlu uji API mati
- [~] Indikator agent/bot aktif di header chat — sebagian ada
- [x] Data chat tersimpan via API Supabase
- [~] Preview sebelum simpan grup/bot — builder preview ada; konfirmasi eksplisit belum seragam

### C7. Cross-browser & device

- [ ] Lihat Fase A1 — wajib untuk launch public

---

## Fase D — Sisa planwiring.md (nice-to-have → pre-launch)

Centang jika ingin **100%** termasuk polish; beberapa bisa ditunda ke v1.1 dengan catatan.

### D1. Flow & edge

- [~] **F1** Login flash — loading screen ada; verifikasi tidak flash **(manual)**
- [x] **F2–F8** Loading/error chat, session 401, verify email, 404, offline, error boundary
- [ ] **F9** Onboarding pertama kali (tour / hint CTA) — opsional v1.1

### D2. Input polish

- [ ] **I2** Helper text permanen password (sebagian ada di P6 — verifikasi semua field)
- [ ] **I3** Penjelasan format `USR-XXXX` sebelum salah input
- [ ] **I5** Validasi email on blur
- [ ] **I6** Indikator kekuatan password — opsional
- [ ] **I8** Character counter jawaban FAQ panjang

### D3. Feedback polish

- [ ] **R10** Toast/snackbar system terpusat
- [ ] **R11** Undo hapus pesan — opsional v1.1
- [ ] **R12** Progress upload avatar
- [ ] **R13** Konfirmasi tutup modal dengan perubahan belum disimpan
- [x] **R1–R8, R9** Konfirmasi, sending, spam hint, CTA register, modal agent

### D4. Navigation

- [x] **N2, N4, N5, N7** Mobile back, document.title, master-detail, deep link
- [ ] **N1** Breadcrumb app-level
- [ ] **N3** Logout vs profil menu — pertimbangkan gabung
- [ ] **N6** Tab bar multi-modul — future

### D5. Edge visual

- [x] **E1–E8** Empty, skeleton, offline, timeout
- [ ] **E9** Empty state berbeda per role (copy khusus owner vs user)
- [ ] **E10** Ilustrasi/ikon empty state

### D6. Consistency

- [ ] **C2** Penjelasan branding O'Apps / Google OAuth di UI
- [ ] **C4** Rename class `faq-bot-builder__back` → generic `panel-back`
- [ ] **C8** Style guide singkat di `docs/`

### D7. Mobile tambahan

- [x] **M5, M6** Master-detail + back header
- [ ] **M9** Audit touch 44px dokumentasi

---

## Fase E — Production ops & QA

### E1. Environment & deploy

- [ ] **Frontend (Netlify):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `VITE_USE_API=true`
- [ ] **Backend (Render/Railway):** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CORS_ORIGIN`, `NODE_ENV=production`
- [ ] **Backend:** `DEEPSEEK_API_KEY` jika AI aktif
- [ ] `DEV_BYPASS_AUTH=false` di server production
- [ ] HTTPS aktif frontend + API **(manual)**
- [ ] Redeploy setelah set env **(manual)**

### E2. Database & akun

- [ ] Skrip `npm run seed:dummy` untuk QA (owner/user test) — **belum ada**
- [ ] Akun `owner@wiring.test` / `user@wiring.test` ada di Supabase production/staging
- [ ] Migrasi SQL dijalankan: `chat_schema.sql`, `profile_avatar_migration.sql`, `supabase_fix_signup.sql`

### E3. Otomatisasi QA

- [x] `npm run smoke:test` — 25/25 pass (perbarui setelah perubahan besar)
- [x] `npm run build` sukses
- [ ] Tambah audit security ke smoke test (DOMPurify file, helmet, sanitize schema)
- [ ] CI GitHub Actions: build + smoke **(opsional)**

### E4. Smoke QA manual (salinan planwiring)

#### Auth
- [x] Login gagal — pesan jelas *(kode)*
- [ ] Login sukses dengan akun Supabase nyata **(manual)**
- [x] Register password tidak cocok
- [ ] Magic link / reset email terkirim **(manual Supabase)**
- [x] Logout konfirmasi

#### Chat
- [x] Daftar room setelah login (tidak auto-buka room)
- [x] Buka room → pesan / empty
- [x] Kirim pesan + spinner
- [x] Hold copy/delete
- [x] Owner builders + back
- [x] Banner offline/API error

#### Mobile 375px
- [ ] Uji tap, scroll, back **(manual)**

### E5. Sign-off

- [ ] Screenshot semua layar utama (login, chat list, room, builders, profil)
- [ ] Reviewer menyetujui skor 100%
- [ ] Tag release git `v1.0.0` + deploy production
- [ ] Monitor error log 24 jam pasca-deploy

---

## Urutan Eksekusi (rekomendasi)

| Hari | Fokus | Item kunci |
|------|-------|------------|
| 1 | A2 + A3 | Inline errors, code-split, a11y label |
| 2 | A1 + C7 | Uji 4 browser + 3 viewport |
| 3 | B4 + E1 + E2 | RLS verify, env production, seed |
| 4 | A4 + D3 | AI typing indicator, toast R10 |
| 5 | D sisa + E5 | Polish, screenshot, sign-off |

---

## Referensi file

| Area | Path |
|------|------|
| Security PRD | `docs/Security_PRD_Origami_OLaundry.md` |
| UI plan lama | `planwiring.md` |
| Cursor rule security | `.cursor/rules/backend-security.mdc` |
| Smoke test | `scripts/smoke-test.mjs` |
| Deploy frontend | `netlify.toml` |
| Schema DB | `chat_schema.sql` |

---

## Changelog planwiring2

| Tanggal | Perubahan |
|---------|-----------|
| Juli 2026 | Dokumen awal — gabungan planwiring + Security PRD + Prelaunch; skor baseline ~60% |
| Juli 2026 | **Fase A kode:** inline form errors, a11y auth, lazy routes, AI processing indicator, bundle split |

---

## Catatan keputusan v1

| Item | Keputusan |
|------|-----------|
| AI streaming | Ditunda v1 — tandai N/A atau centang setelah implementasi |
| Onboarding F9 | Opsional v1.1 |
| Undo hapus R11 | Opsional v1.1 |
| Target skor | **100%** = semua `[ ]` tercentang kecuali yang ditandai **N/A v1** dengan persetujuan explisit |

**"Ship fast, but ship right."** — centang semua, baru deploy.
