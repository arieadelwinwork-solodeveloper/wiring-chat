import { Router } from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { handleDatabaseError } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../schemas/index.js';
import { isMemoryMode, memoryGetProfile, memoryUpdateProfile } from '../lib/memoryStore.js';
import { generateNomorId } from '../lib/nomorId.js';

const router = Router();

function profileResponse(profile, roleOverride) {
  return {
    id: profile.id,
    name: profile.display_name,
    avatarColor: profile.avatar_color,
    role: roleOverride ?? profile.role,
    nomorId: profile.nomor_id,
    initials: profile.display_name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  };
}

async function ensureNomorId(supabase, userId, profile) {
  if (profile.nomor_id) return profile;

  const nomor_id = generateNomorId();
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      nomor_id,
      display_name: profile.display_name ?? 'Pengguna',
      avatar_color: profile.avatar_color ?? '#0a2540',
      role: profile.role ?? 'user',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

router.get('/me', async (req, res) => {
  try {
    if (isMemoryMode()) {
      const profile = memoryGetProfile(req.user.id);
      return res.json(profileResponse(profile, req.user.role ?? profile.role));
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) return handleDatabaseError(error, res);

    let profile = data ?? {
      id: req.user.id,
      display_name: req.user.displayName ?? 'Pengguna',
      avatar_color: req.user.avatarColor ?? '#0a2540',
      role: req.user.role ?? 'user',
      nomor_id: null,
    };

    if (!profile.nomor_id) {
      profile = await ensureNomorId(supabase, req.user.id, profile);
    }

    res.json(profileResponse(profile));
  } catch (err) {
    console.error('[PROFILE GET]', err);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

router.patch('/me', validate(updateProfileSchema), async (req, res) => {
  try {
    if (isMemoryMode()) {
      const updates = {};
      if (req.validatedData.display_name) updates.display_name = req.validatedData.display_name;
      if (req.validatedData.avatar_color) updates.avatar_color = req.validatedData.avatar_color;
      const data = memoryUpdateProfile(req.user.id, updates);
      return res.json(profileResponse(data));
    }

    const supabase = getSupabaseAdmin();
    const updates = {};
    if (req.validatedData.display_name) updates.display_name = req.validatedData.display_name;
    if (req.validatedData.avatar_color) updates.avatar_color = req.validatedData.avatar_color;

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ id: req.user.id, ...updates })
      .select()
      .single();

    if (error) return handleDatabaseError(error, res);

    let profile = data;
    if (!profile.nomor_id) {
      profile = await ensureNomorId(supabase, req.user.id, profile);
    }

    res.json(profileResponse(profile));
  } catch (err) {
    console.error('[PROFILE PATCH]', err);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

export default router;
