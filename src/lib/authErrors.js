const AUTH_ERROR_MESSAGES = {
  user_already_exists: 'Email sudah terdaftar. Silakan masuk.',
  email_exists: 'Email sudah terdaftar. Silakan masuk.',
  weak_password: 'Password terlalu lemah. Gunakan minimal 8 karakter.',
  invalid_credentials: 'Email atau password salah.',
  email_not_confirmed: 'Email belum diverifikasi. Cek inbox Gmail Anda.',
  signup_disabled: 'Pendaftaran dinonaktifkan. Hubungi admin.',
  over_email_send_rate_limit: 'Terlalu banyak percobaan. Coba lagi nanti.',
  over_request_rate_limit: 'Terlalu banyak percobaan. Coba lagi nanti.',
};

export function getAuthErrorMessage(err, fallback = 'Terjadi kesalahan. Coba lagi.') {
  if (!err) return fallback;
  if (typeof err === 'string' && err.trim() && err !== '{}') return err;

  const code = err.code || err.error_code;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  const message = err.message || err.error_description || err.msg;
  if (typeof message === 'string' && message.trim() && message !== '{}') {
    if (/database error saving new user/i.test(message)) {
      return 'Gagal membuat profil akun. Pastikan schema Supabase (chat_schema.sql) sudah dijalankan.';
    }
    if (/user already registered/i.test(message)) {
      return 'Email sudah terdaftar. Silakan masuk.';
    }
    return message;
  }

  return fallback;
}
