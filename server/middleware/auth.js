import { getSupabaseAdmin } from '../lib/supabase.js';
import { env } from '../config/env.js';
import { memoryGetProfile } from '../lib/memoryStore.js';

export async function authMiddleware(req, res, next) {
  if (env.devBypassAuth) {
    if (env.nodeEnv === 'production') {
      return res.status(503).json({ error: 'Terjadi kesalahan sistem' });
    }

    const profile = memoryGetProfile(env.devUserId);
    req.user = {
      id: env.devUserId,
      email: 'dev@wiring.local',
      role: env.devUserRole,
      displayName: profile?.display_name ?? 'Dev User',
    };
    req.accessToken = 'dev-token';
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({ error: 'Terjadi kesalahan sistem' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, display_name, avatar_color, nomor_id')
    .eq('id', user.id)
    .maybeSingle();

  req.user = {
    ...user,
    role: profile?.role ?? 'user',
    displayName: profile?.display_name,
    avatarColor: profile?.avatar_color,
    nomorId: profile?.nomor_id,
  };
  req.accessToken = token;
  next();
}

export function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Akses ditolak' });
  }
  next();
}
