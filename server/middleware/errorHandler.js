export function errorHandler(err, req, res, next) {
  console.error('[UNHANDLED ERROR]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  const status = err.status || 500;

  if (status === 403) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }

  if (status === 404) {
    return res.status(404).json({ error: 'Data tidak ditemukan' });
  }

  res.status(status).json({
    error: 'Terjadi kesalahan sistem',
  });
}
