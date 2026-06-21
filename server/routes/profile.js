import { Router } from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { handleDatabaseError } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../schemas/index.js';
import { isMemoryMode, memoryGetProfile, memoryUpdateProfile } from '../lib/memoryStore.js';

const router = Router();

router.get('/me', async (req, res) => {
  try {
    if (isMemoryMode()) {
      const profile = memoryGetProfile(req.user.id);
      return res.json({
        id: profile.id,
        name: profile.display_name,
        avatarColor: profile.avatar_color,
        role: req.user.role ?? profile.role,
        nomorId: profile.nomor_id,
        initials: profile.display_name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
      });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) return handleDatabaseError(error, res);

    const profile = data ?? {
      id: req.user.id,
      display_name: req.user.displayName ?? 'Pengguna',
      avatar_color: req.user.avatarColor ?? '#0a2540',
      role: req.user.role ?? 'user',
    };

    res.json({
      id: profile.id,
      name: profile.display_name,
      avatarColor: profile.avatar_color,
      role: profile.role,
      nomorId: profile.nomor_id,
      initials: profile.display_name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    });
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
      return res.json({
        id: data.id,
        name: data.display_name,
        avatarColor: data.avatar_color,
        role: data.role,
      });
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

    res.json({
      id: data.id,
      name: data.display_name,
      avatarColor: data.avatar_color,
      role: data.role,
    });
  } catch (err) {
    console.error('[PROFILE PATCH]', err);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

export default router;
