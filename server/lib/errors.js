export function handleDatabaseError(err, res) {
  console.error('[DB ERROR]', {
    message: err.message,
    code: err.code,
    timestamp: new Date().toISOString(),
  });

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Data sudah ada, gunakan data yang berbeda' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Data referensi tidak ditemukan' });
  }
  return res.status(500).json({ error: 'Terjadi kesalahan sistem, coba beberapa saat lagi' });
}

export function sendGenericError(res, status = 500) {
  return res.status(status).json({ error: 'Terjadi kesalahan sistem' });
}
