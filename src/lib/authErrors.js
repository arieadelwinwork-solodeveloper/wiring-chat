const AUTH_ERROR_MESSAGES = {
  user_already_exists: 'Email sudah terdaftar. Silakan masuk.',
  email_exists: 'Email sudah terdaftar. Silakan masuk.',
  unexpected_failure: 'Gagal membuat akun. Jalankan supabase_fix_signup.sql di Supabase SQL Editor.',
  weak_password: 'Password terlalu lemah. Gunakan minimal 8 karakter.',
  invalid_credentials: 'Email atau password salah.',
  email_not_confirmed: 'Email belum diverifikasi. Cek inbox email Anda (termasuk folder spam).',
  signup_disabled: 'Pendaftaran dinonaktifkan. Hubungi admin.',
  over_email_send_rate_limit: 'Terlalu banyak percobaan. Coba lagi nanti.',
  over_request_rate_limit: 'Terlalu banyak percobaan. Coba lagi nanti.',
  bad_json: 'Permintaan tidak valid. Coba lagi.',
  same_password: 'Password baru harus berbeda dari password lama.',
};

function isDatabaseSignupFailure(message) {
  return /database error saving new user/i.test(message || '');
}

export function getAuthErrorMessage(err, fallback = 'Terjadi kesalahan. Coba lagi.') {
  if (!err) return fallback;
  if (typeof err === 'string' && err.trim() && err !== '{}') return err;

  const code = err.code || err.error_code;
  const message = err.message || err.msg || err.error_description;

  if (isDatabaseSignupFailure(message)) {
    return 'Gagal membuat profil akun. Buka Supabase → SQL Editor → jalankan file supabase_fix_signup.sql dari repo GitHub.';
  }

  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  if (typeof message === 'string' && message.trim() && message !== '{}') {
    if (/user already registered/i.test(message)) {
      return 'Email sudah terdaftar. Silakan masuk.';
    }
    return message;
  }

  return fallback;
}
