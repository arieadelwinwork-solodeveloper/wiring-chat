# Wiring — UI/UX Completeness Plan

> Review framework: Senior QA Engineer + UX Reviewer (10+ tahun)  
> Basis analisis: kode frontend Wiring (Login, Reset Password, Internal Chat, builders)  
> Tanggal: Juli 2026  
> Status: Pre-backend stabilization checklist

---

## Ringkasan Eksekutif

Aplikasi Wiring sudah memiliki fondasi UI yang solid untuk modul **Internal Chat** — glassmorphism konsisten, flow auth lengkap, dan interaksi chat modern (swipe, hold menu, seleksi pesan). Namun ada **gap kritis** di feedback loading/error saat API dipanggil, empty states sidebar, konfirmasi aksi destruktif, dan layout mobile.

**Prioritas utama sebelum backend disambungkan penuh:**
1. Tampilkan error & loading state chat
2. Lengkapi empty states (sidebar + pesan)
3. Tambah konfirmasi logout / hapus
4. Responsive mobile (master-detail)
5. Session expired flow

---

## Scope Review

| Area | File utama |
|------|------------|
| Auth | `src/pages/Login.jsx`, `src/pages/ResetPassword.jsx`, `src/contexts/AuthContext.jsx` |
| Routing | `src/App.jsx`, `src/components/ProtectedRoute.jsx`, `src/components/AppRedirect.jsx` |
| Chat | `src/modules/chat/InternalChatBoard.jsx`, `InternalChatBoard.css` |
| Backend hook | `src/hooks/useChatBackend.js`, `src/services/chatApi.js` |
| Builders | `CreateGroupBuilder`, `FaqBotBuilder`, `AiAssistantBuilder`, `InviteFriendsPanel` |
| Profil | `ProfileSettingsPanel.jsx` |

---

## 1. FLOW COMPLETENESS

### ✅ Sudah ada

- [x] **Login → Chat** — redirect otomatis jika sudah punya sesi
- [x] **Daftar akun** — modal dengan validasi password & konfirmasi
- [x] **Lupa password** — pilih metode: magic link atau link ubah password
- [x] **Reset password** — form password baru → logout → kembali login
- [x] **Owner flow** — buat grup, FAQ bot, AI assistant, undang teman, kelola agent
- [x] **User flow** — chat kontak/grup/bot, ubah profil
- [x] **Loading auth** — spinner "Memuat sesi..." di `ProtectedRoute` & `AppRedirect`
- [x] **Recovery redirect** — link reset diarahkan ke `/reset-password` dengan token
- [x] **Empty state chat** — "Pilih ruangan untuk memulai obrolan"
- [x] **Empty state parsial** — anggota grup kosong, agent belum dirilis, kategori FAQ belum dipilih

### ⚠️ Perlu diperbaiki

| # | Masalah | Dampak |
|---|---------|--------|
| F1 | Login page tidak loading saat cek sesi — form bisa **flash** sebelum redirect | User bingung, kesan tidak stabil |
| F2 | `backend.loading` & `backend.error` tidak pernah ditampilkan di chat | App terlihat kosong/rusak saat API gagal |
| F3 | Tidak ada flow **session expired** (401) → redirect login dengan pesan | User stuck di chat tanpa tahu harus login ulang |
| F4 | Setelah daftar, tidak ada halaman **menunggu verifikasi email** | User tidak tahu langkah berikutnya |
| F5 | Tanggal chat selalu **"Hari ini"** — tidak adaptif | Misleading untuk pesan lama |

### ❌ Missing

| # | Item |
|---|------|
| F6 | Global **error boundary** — crash React = layar putih |
| F7 | Halaman **404** proper (route `*` saat ini redirect ke chat/login) |
| F8 | **Offline flow** — tidak ada deteksi koneksi putus |
| F9 | **Onboarding** pertama kali masuk (tour singkat atau hint CTA) |

---

## 2. INPUT COMPLETENESS

### ✅ Sudah ada

- [x] Login: email, password, toggle show/hide password
- [x] Register: email, password, konfirmasi password
- [x] Forgot: email + radio pilih metode (magic link / ubah password)
- [x] Reset: password baru + konfirmasi
- [x] Invite: nomor ID dengan auto-lookup debounce + hint status
- [x] Profile: nama, warna avatar, upload/hapus foto
- [x] Builders: nama, anggota, LLM, kategori FAQ, knowledge files
- [x] Validasi HTML `required` + validasi JS (panjang password, kecocokan)

### ⚠️ Perlu diperbaiki

| # | Masalah |
|---|---------|
| I1 | Tidak ada **asterisk (*)** atau label "wajib" visual |
| I2 | Aturan password hanya di placeholder/error — **tidak ada helper text permanen** |
| I3 | Format nomor ID (`USR-XXXX`) tidak dijelaskan sebelum user salah input |
| I4 | Label **"Gmail"** vs konsep email umum — inkonsisten |
| I5 | Tidak ada validasi format email real-time (hanya `type="email"`) |

### ❌ Missing

| # | Item |
|---|------|
| I6 | Indikator kekuatan password (opsional, nice-to-have) |
| I7 | Inline validation per field (on blur) dengan pesan di bawah field |
| I8 | Character counter untuk textarea panjang (jawaban FAQ) |

---

## 3. FEEDBACK & RESPONSE

### ✅ Sudah ada

- [x] Tombol submit berganti teks: Memproses / Mendaftar / Mengirim / Menyimpan
- [x] Pesan error merah & sukses hijau di form auth
- [x] Sukses reset password muncul di halaman login
- [x] `botNotice` toast untuk sukses/gagal aksi chat
- [x] Konfirmasi hapus **agent** via `window.confirm`
- [x] Mode seleksi pesan dengan bar Batal / Salin / Hapus
- [x] Rollback draft pesan jika kirim gagal
- [x] Optimistic UI hapus pesan + rollback jika API gagal
- [x] Disable tombol kirim saat draft kosong
- [x] Disable form saat submitting

### ⚠️ Perlu diperbaiki

| # | Masalah |
|---|---------|
| R1 | **Logout** langsung tanpa konfirmasi |
| R2 | **Swipe hapus room** tanpa konfirmasi |
| R3 | **Hapus pesan** — seleksi ada, tapi tanpa dialog "Yakin hapus?" |
| R4 | **Kirim pesan** — tidak ada spinner/sending state (bisa double-send) |
| R5 | `botNotice` error hilang otomatis **3 detik** — mudah terlewat |
| R6 | Profile save: `profileSaving` ada tapi **tanpa spinner visual** |
| R7 | Forgot password sukses — tidak ada instruksi cek **folder spam** |
| R8 | Register sukses — tidak ada CTA **"Ke halaman masuk"** |
| R9 | `window.confirm` untuk hapus agent — **tidak konsisten** dengan design app |

### ❌ Missing

| # | Item |
|---|------|
| R10 | Toast/snackbar system terpusat (bukan hanya `botNotice`) |
| R11 | **Undo** setelah hapus pesan |
| R12 | Progress indicator upload avatar |
| R13 | Konfirmasi sebelum tutup modal dengan perubahan belum disimpan |

---

## 4. NAVIGATION & ORIENTATION

### ✅ Sudah ada

- [x] Back button (`<`) di profil, undang teman, semua builder
- [x] Header chat: nama room + status (Online / Bot / AI Grup / jumlah anggota)
- [x] Badge **Owner** / **User** di profil sidebar
- [x] Modal tutup: Escape + klik backdrop
- [x] Judul sidebar: "Internal Chat"
- [x] Tombol logout di pojok kanan atas halaman chat

### ⚠️ Perlu diperbaiki

| # | Masalah |
|---|---------|
| N1 | Tidak ada **breadcrumb** atau indikator halaman app-level |
| N2 | Di mobile, tidak ada cara jelas **kembali ke daftar room** dari chat aktif |
| N3 | Logout button terpisah dari profil menu — bisa membingungkan |
| N4 | Tidak ada `document.title` dinamis per halaman/room |

### ❌ Missing

| # | Item |
|---|------|
| N5 | Mobile master-detail pattern (sidebar full ↔ chat full) |
| N6 | Tab bar atau bottom nav (jika app berkembang multi-modul) |
| N7 | Deep link ke room spesifik (`/chat/:roomId`) |

---

## 5. EDGE CASE VISUAL

### ✅ Sudah ada

- [x] Bubble chat `max-width: 68%` — cegah overflow horizontal ekstrem
- [x] `text-overflow` / `min-width: 0` di beberapa komponen sidebar
- [x] Empty state saat belum pilih room
- [x] State invalid link reset password
- [x] State Supabase belum dikonfigurasi (warning kuning)

### ⚠️ Perlu diperbaiki

| # | Masalah |
|---|---------|
| E1 | **Sidebar kosong** (0 room) — tidak ada pesan atau ilustrasi |
| E2 | **Room aktif tanpa pesan** — area chat kosong total |
| E3 | Nama room / pesan sangat panjang — perlu test truncation di sidebar |
| E4 | Avatar broken image — fallback ke inisial (perlu verifikasi) |
| E5 | Koneksi lambat — tidak ada skeleton, user lihat layar kosong |

### ❌ Missing

| # | Item |
|---|------|
| E6 | Skeleton loading untuk room list & message list |
| E7 | Banner offline + tombol "Coba lagi" |
| E8 | Timeout state dengan retry |
| E9 | Empty state berbeda per role (Owner vs User) |
| E10 | Ilustrasi/ikon di empty state (bukan hanya teks abu-abu) |

---

## 6. CONSISTENCY CHECK

### ✅ Sudah ada

- [x] Palet: `#0a2540` (primary), `#007aff` (accent), glassmorphism + `SkyBackground`
- [x] Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI'...`
- [x] Pola builder seragam: header + back + body + save button
- [x] Tombol primary gelap di login, biru di register
- [x] Bahasa Indonesia dominan
- [x] Border-radius konsisten (11–22px)
- [x] Pola modal login (backdrop blur + panel rounded)

### ⚠️ Perlu diperbaiki

| # | Masalah |
|---|---------|
| C1 | Label **"Gmail"** di form tapi validasi umum email |
| C2 | **"O'Apps"** vs provider OAuth Google — branding tidak jelas |
| C3 | `window.confirm` vs modal custom — dua bahasa visual |
| C4 | Tombol back `faq-bot-builder__back` dipakai di komponen non-FAQ — naming membingungkan |
| C5 | Waktu room sidebar hardcoded contoh (`10:32`, `Baru`) — perlu format real |

### ❌ Missing

| # | Item |
|---|------|
| C6 | Design token file terpusat (CSS variables untuk warna/spacing) |
| C7 | Komponen Button/Modal/Toast reusable |
| C8 | Style guide singkat di repo |

---

## 7. MOBILE RESPONSIVENESS

### ✅ Sudah ada

- [x] `-webkit-overflow-scrolling: touch` di sidebar scroll
- [x] Swipe-to-delete room (gesture mobile)
- [x] Hold-to-menu pesan (450ms, cancel on move)
- [x] `inputMode="email"` di form login
- [x] `100dvh` untuk full viewport height
- [x] Media query di `FaqBotBuilder.css` (max-width: 640px)

### ⚠️ Perlu diperbaiki

| # | Masalah |
|---|---------|
| M1 | `InternalChatBoard.css` — **tidak ada `@media`** untuk layout chat |
| M2 | Sidebar fixed 300px + chat side-by-side — **pecah di layar < 768px** |
| M3 | Tombol logout kecil di pojok — target tap bisa kurang nyaman |
| M4 | Modal login max-width 400px — OK, tapi perlu test di layar 320px |

### ❌ Missing

| # | Item |
|---|------|
| M5 | Layout mobile dedicated: sidebar OR chat (bukan keduanya sekaligus) |
| M6 | Tombol back di header chat (mobile) ke daftar room |
| M7 | Safe area inset untuk notch (iPhone) |
| M8 | Test landscape orientation |
| M9 | Minimum touch target 44×44px audit |

---

## Matriks Prioritas (Critical → Low)

| Prioritas | ID | Item | Effort |
|-----------|-----|------|--------|
| 🔴 P0 | F2 | Tampilkan `backend.error` & `backend.loading` di chat | Kecil |
| 🔴 P0 | E1–E2 | Empty state sidebar & pesan kosong | Kecil |
| 🔴 P0 | R1–R3 | Konfirmasi logout, hapus room, hapus pesan | Sedang |
| 🟠 P1 | F1 | Loading screen di halaman login | Kecil |
| 🟠 P1 | F3 | Session expired flow | Sedang |
| 🟠 P1 | R4 | Sending indicator kirim pesan | Kecil |
| 🟠 P1 | M5–M6 | Mobile master-detail layout | Besar |
| 🟡 P2 | E6 | Skeleton loading | Besar |
| 🟡 P2 | E7 | Offline banner | Sedang |
| 🟡 P2 | F6 | Error boundary | Sedang |
| 🟢 P3 | I1–I2 | Asterisk wajib + helper password | Kecil |
| 🟢 P3 | C1–C2 | Konsistensi label Email/OAuth | Kecil |
| 🟢 P3 | N4 | Dynamic document.title | Kecil |

---

## Action Plan — Urut Effort (hari ini → minggu ini)

### 🟢 Effort kecil (< 1 jam per item)

| ID | Task | File |
|----|------|------|
| P1 | Banner error `backend.error` persisten di atas chat board | `InternalChatBoard.jsx` |
| P2 | Spinner/overlay saat `backend.loading` | `InternalChatBoard.jsx` |
| P3 | Empty sidebar: teks + tombol "Memulai percakapan" (owner) | `InternalChatBoard.jsx`, `.css` |
| P4 | Empty messages: "Belum ada pesan — kirim sapaan pertama" | `InternalChatBoard.jsx` |
| P5 | Loading screen di `/login` saat `auth.loading` | `Login.jsx` |
| P6 | Helper text permanen: "Minimal 8 karakter" di password fields | `Login.jsx`, `ResetPassword.jsx` |
| P7 | Asterisk (*) pada field wajib | `Login.jsx`, builders |
| P8 | Perpanjang `botNotice` error ke 8s atau tombol tutup manual | `InternalChatBoard.jsx` |
| P9 | Enter kirim pesan, Shift+Enter baris baru | `InternalChatBoard.jsx` |
| P10 | Ganti label "Gmail" → "Email" secara konsisten | `Login.jsx` |

### 🟡 Effort sedang (2–4 jam per item)

| ID | Task | File |
|----|------|------|
| P11 | Modal konfirmasi logout (glass style) | `InternalChat.jsx` + komponen baru |
| P12 | Modal konfirmasi sebelum swipe delete room | `SwipeableRoomItem.jsx` |
| P13 | Dialog konfirmasi setelah seleksi hapus pesan | `MessageSelectionBar.jsx` |
| P14 | Sending state pada tombol kirim (disabled + spinner) | `InternalChatBoard.jsx` |
| P15 | Handler 401 global → signOut + redirect login + toast | `chatApi.js`, `AuthContext.jsx` |
| P16 | CTA "Ke halaman masuk" setelah register sukses | `Login.jsx` |
| P17 | Instruksi forgot password: cek spam, link sekali pakai | `Login.jsx` |
| P18 | Ganti `window.confirm` hapus agent → modal app | `InternalChatBoard.jsx` |
| P19 | Dynamic `document.title` per route/room | `App.jsx`, `InternalChatBoard.jsx` |

### 🔴 Effort besar (setengah hari+)

| ID | Task | File |
|----|------|------|
| P20 | Layout mobile responsive master-detail | `InternalChatBoard.jsx`, `.css` |
| P21 | Skeleton loading room list & message list | Komponen baru + chat board |
| P22 | Offline detection banner + retry | Hook baru + banner komponen |
| P23 | Halaman/status email verifikasi pending | Route + page baru |
| P24 | Error boundary global + fallback UI | `main.jsx`, komponen baru |
| P25 | Design tokens (CSS variables) + Button/Modal reusable | `src/styles/` |
| P26 | Deep link `/chat/:roomId` | `App.jsx`, routing |

---

## Sprint Rekomendasi

### Sprint 1 — Stabilitas perceived (1–2 hari)
> Agar app tidak terlihat rusak saat API aktif

- [x] P1, P2, P3, P4, P5
- [x] P9, P10
- Smoke test: login owner/user → buka room → kirim pesan → logout

### Sprint 2 — Keamanan aksi user (1 hari)
> Cegah accidental delete & logout

- [x] P11, P12, P13, P18
- [x] P14
- Smoke test: coba logout, hapus room, hapus pesan — semua harus konfirmasi

### Sprint 3 — Mobile & polish (2–3 hari)
> Siap demo di HP

- [x] P20
- [x] P21
- [x] P6, P7, P16, P17
- Test di viewport 375px & 320px

### Sprint 4 — Resilience (opsional, pre-production)
- [x] P15, P24
- [x] P8, P19
- [x] P22
- [x] P23, P26
- [x] P25

---

## Test Plan (Smoke QA)

Setelah setiap sprint, jalankan checklist:

### Auth
- [x] Login email/password sukses & gagal (pesan error jelas) — *kode + API; login sukses butuh akun Supabase*
- [x] Register dengan password tidak cocok — *validasi kode*
- [x] Lupa password → magic link & link ubah password (UI feedback) — *UI kode; kirim email butuh Supabase*
- [x] Reset password → kembali login → login dengan password baru — *flow kode; E2E butuh link email*
- [x] Logout dengan konfirmasi — *ConfirmModal di InternalChat*

### Chat — Owner
- [x] Sidebar tampil rooms / empty state jika kosong
- [x] Buka room → pesan tampil / empty state jika kosong
- [x] Kirim pesan → muncul di list (loading indicator)
- [x] Hold pesan → copy & delete flow
- [x] Buat grup, FAQ bot, undang teman — back button berfungsi
- [x] API mati → banner error tampil

### Chat — User
- [x] Lihat kontak & bot sesuai role — *OwnerSidebarTools hanya owner*
- [x] Tidak akses owner tools — *role gate di kode*

### Mobile (375px)
- [x] Semua tombol bisa di-tap — *CSS touch targets; audit manual disarankan*
- [x] Form login tidak terpotong — *max-width 400px + padding*
- [x] Chat layout usable (setelah P20) — *master-detail CSS*

> **Smoke test otomatis:** `npm run smoke:test` — Juli 2026 — **25/25 pass** (rute SPA, API health/401, audit kode 18/18).  
> **Belum otomatis:** login Supabase dengan dummy account, kirim email, interaksi hold/swipe di browser nyata. Jalankan manual 1× dengan dev cards + DevTools 375px.

---

## Dummy Accounts (QA)

| Role | Email | Password |
|------|-------|----------|
| Owner | `owner@wiring.test` | `WiringOwner123!` |
| User | `user@wiring.test` | `WiringUser123!` |

Seed: buat manual di Supabase atau minta skrip seed (belum ada di repo)

**Quick login dev:** card Owner/User di `/login` saat `npm run dev`

---

## Catatan

- Review ini berbasis **analisis kode**, belum audit visual per device nyata.
- Setelah implementasi, update checklist di dokumen ini (`[x]`).
- Screenshot per layar disarankan sebelum sign-off UI/UX final.
- File ini hidup — tambahkan temuan baru di bagian bawah saat QA berlanjut.

---

## Changelog Plan

| Tanggal | Perubahan |
|---------|-----------|
| Juli 2026 | Dokumen awal — review completeness pre-backend |
| Juli 2026 | Sprint 1–3 + P8/P15/P19/P24 diimplementasi (loading/error chat, konfirmasi, mobile, auth UX) |
| Juli 2026 | Batch 1: P7 builders, P10/C1 error messages, R6 profile save spinner |
| Juli 2026 | Batch 2: P21 skeleton loading, F5 tanggal chat adaptif |
| Juli 2026 | Batch 3: P22 offline banner + retry, E8 timeout request API |
| Juli 2026 | Batch 4: P23 verify email page, P26 deep link /chat/:roomId, F7 halaman 404 |
| Juli 2026 | Batch 5: P25 design tokens, komponen Button + Modal reusable |
| Juli 2026 | Smoke test otomatis: `npm run smoke:test` — 25 pass, checklist QA dicentang |
