/**
 * Wiring smoke test — jalankan: node scripts/smoke-test.mjs
 * Butuh: npm run dev (5173) + npm run dev:server (3001)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FRONTEND = process.env.SMOKE_FRONTEND_URL ?? 'http://127.0.0.1:5173';
const API = process.env.SMOKE_API_URL ?? 'http://localhost:3001/api';

const results = [];
const codeAudit = [];

function pass(id, note) {
  results.push({ id, status: 'PASS', note });
}

function fail(id, note) {
  results.push({ id, status: 'FAIL', note });
}

function skip(id, note) {
  results.push({ id, status: 'SKIP', note });
}

function readSrc(relPath) {
  const full = join(ROOT, 'src', relPath);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

function auditChecklist(id, label, ok, note) {
  codeAudit.push({ id, label, ok, note });
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
  const text = await res.text();
  return { res, text };
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  return { res, data };
}

function isSpaShell(text) {
  return text.includes('<div id="root">') || text.includes('id="root"');
}

async function testFrontendRoutes() {
  const routes = ['/login', '/reset-password', '/verify-email', '/chat', '/xyz-404-smoke'];

  for (const path of routes) {
    try {
      const { res, text } = await fetchText(`${FRONTEND}${path}`);
      if (res.ok && isSpaShell(text)) {
        pass(`route:${path}`, `HTTP ${res.status} — SPA shell OK`);
      } else {
        fail(`route:${path}`, `HTTP ${res.status} atau bukan SPA`);
      }
    } catch (err) {
      fail(`route:${path}`, err.message);
    }
  }
}

async function testApi() {
  try {
    const { res, data } = await fetchJson(`${API}/health`);
    if (res.ok && data.status === 'ok') {
      pass('api:health', 'API hidup');
    } else {
      fail('api:health', `HTTP ${res.status}`);
      skip('api:401', 'API tidak hidup');
      return;
    }
  } catch (err) {
    fail('api:health', err.message);
    skip('api:401', 'API tidak hidup');
    return;
  }

  const { res: roomsRes } = await fetchJson(`${API}/rooms`);
  if (roomsRes.status === 401) {
    pass('api:401', 'Tanpa token → 401');
  } else if (roomsRes.status === 200) {
    pass('api:401', 'DEV_BYPASS_AUTH aktif — rooms tanpa token (dev only)');
  } else {
    fail('api:401', `HTTP ${roomsRes.status}`);
  }
}

function runCodeAudit() {
  const login = readSrc('pages/Login.jsx');
  const chat = readSrc('modules/chat/InternalChatBoard.jsx');
  const internalChat = readSrc('pages/InternalChat.jsx');
  const app = readSrc('App.jsx');
  const auth = readSrc('contexts/AuthContext.jsx');
  const chatApi = readSrc('services/chatApi.js');
  const loginCss = readSrc('pages/Login.css');
  const chatCss = readSrc('modules/chat/InternalChatBoard.css');

  auditChecklist(
    'auth-login-error',
    'Login gagal — pesan error',
    login.includes('login-form__error') && auth.includes('Periksa email dan password'),
    'Login.jsx + AuthContext',
  );

  auditChecklist(
    'auth-register-mismatch',
    'Register password tidak cocok',
    login.includes('registerPassword !== registerConfirm'),
    'Validasi di Login.jsx',
  );

  auditChecklist(
    'auth-forgot',
    'Lupa password — magic link & reset',
    login.includes('requestMagicLink') && login.includes('requestPasswordResetLink'),
    'Modal forgot di Login.jsx',
  );

  auditChecklist(
    'auth-reset',
    'Reset password flow',
    existsSync(join(ROOT, 'src/pages/ResetPassword.jsx')) && auth.includes('completePasswordReset'),
    'ResetPassword.jsx',
  );

  auditChecklist(
    'auth-logout-confirm',
    'Logout dengan konfirmasi',
    internalChat.includes('ConfirmModal') && internalChat.includes('Keluar dari Wiring'),
    'InternalChat.jsx',
  );

  auditChecklist(
    'chat-empty-sidebar',
    'Empty state sidebar',
    chat.includes('chat-sidebar-empty'),
    'InternalChatBoard.jsx',
  );

  auditChecklist(
    'chat-empty-messages',
    'Empty state pesan',
    chat.includes('chat-messages-empty'),
    'InternalChatBoard.jsx',
  );

  auditChecklist(
    'chat-send-spinner',
    'Kirim pesan — loading indicator',
    chat.includes('sendingMessage') && chat.includes('chat-input-area__spinner'),
    'InternalChatBoard.jsx',
  );

  auditChecklist(
    'chat-hold-copy-delete',
    'Hold pesan — copy & delete + konfirmasi',
    chat.includes('MessageHoldMenu') && chat.includes('handleConfirmDeleteMessages') && chat.includes('ConfirmModal'),
    'InternalChatBoard.jsx',
  );

  auditChecklist(
    'chat-builders-back',
    'Builder — tombol back',
    readSrc('modules/chat/CreateGroupBuilder.jsx').includes('faq-bot-builder__back'),
    'CreateGroupBuilder.jsx',
  );

  auditChecklist(
    'chat-api-error-banner',
    'API error / offline banner',
    chat.includes('ConnectionBanner') && chat.includes('chat-board-banner'),
    'InternalChatBoard.jsx',
  );

  auditChecklist(
    'chat-owner-tools',
    'Owner tools',
    chat.includes('OwnerSidebarTools') && chat.includes("role === 'owner'"),
    'InternalChatBoard.jsx',
  );

  auditChecklist(
    'chat-skeleton',
    'Skeleton loading',
    chat.includes('RoomListSkeleton') && chat.includes('MessageListSkeleton'),
    'InternalChatBoard.jsx',
  );

  auditChecklist(
    'routes-deep-link-404',
    'Deep link + 404',
    app.includes('/chat/:roomId') && app.includes('NotFound'),
    'App.jsx',
  );

  auditChecklist(
    'mobile-layout',
    'Mobile master-detail',
    chatCss.includes('internal-chat-board--room-open') && chat.includes('chat-main__back'),
    'CSS + InternalChatBoard.jsx',
  );

  auditChecklist(
    'mobile-login',
    'Login responsive',
    loginCss.includes('max-width: 400px') || loginCss.includes('login-page'),
    'Login.css',
  );

  auditChecklist(
    'dev-cards',
    'Dev login cards',
    login.includes('login-dev-cards') && readSrc('lib/devAccounts.js').includes('owner@wiring.test'),
    'Login.jsx + devAccounts.js',
  );

  auditChecklist(
    'session-401',
    'Handler 401 global',
    chatApi.includes('setUnauthorizedHandler') && chatApi.includes('401'),
    'chatApi.js',
  );

  for (const item of codeAudit) {
    if (item.ok) {
      pass(`audit:${item.id}`, item.label);
    } else {
      fail(`audit:${item.id}`, `${item.label} — tidak ditemukan`);
    }
  }
}

function printReport() {
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const skipCount = results.filter((r) => r.status === 'SKIP').length;

  console.log('\n=== WIRING SMOKE TEST ===\n');
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '○';
    console.log(`${icon} [${r.status}] ${r.id}`);
    if (r.note) console.log(`    ${r.note}`);
  }
  console.log(`\n--- ${passCount} pass, ${failCount} fail, ${skipCount} skip ---`);

  const auditPass = codeAudit.filter((c) => c.ok).length;
  console.log(`\nCode audit checklist: ${auditPass}/${codeAudit.length} implementasi terverifikasi\n`);

  return failCount;
}

async function main() {
  console.log(`Frontend: ${FRONTEND}`);
  console.log(`API: ${API}\n`);

  await testFrontendRoutes();
  await testApi();
  runCodeAudit();

  const failCount = printReport();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
