import { Router } from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { handleDatabaseError } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, uploadAvatarSchema } from '../schemas/index.js';
import { isMemoryMode, memoryGetProfile, memoryUpdateProfile } from '../lib/memoryStore.js';
import { generateNomorId } from '../lib/nomorId.js';

const router = Router();
const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 500_000;

function profileResponse(profile, roleOverride) {
  return {
    id: profile.id,
    name: profile.display_name,
    avatarColor: profile.avatar_color,
    avatarUrl: profile.avatar_url ?? null,
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

function decodeImageData(imageData) {
  const match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null;

  const [, ext, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > MAX_AVATAR_BYTES) {
    const err = new Error('Gambar terlalu besar');
    err.status = 400;
    throw err;
  }

  const mimeMap = { jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
  const contentType = mimeMap[ext.toLowerCase()] ?? 'image/jpeg';
  const fileExt = ext === 'jpeg' ? 'jpg' : ext;

  return { buffer, contentType, fileExt };
}

async function uploadAvatarToStorage(supabase, userId, imageData) {
  const decoded = decodeImageData(imageData);
  if (!decoded) {
    const err = new Error('Format gambar tidak valid');
    err.status = 400;
    throw err;
  }

  const path = `${userId}/avatar.${decoded.fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, decoded.buffer, { contentType: decoded.contentType, upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${urlData.publicUrl}?t=${Date.now()}`;
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
      avatar_url: null,
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
      if (req.validatedData.avatar_url !== undefined) {
        updates.avatar_url = req.validatedData.avatar_url || null;
      }
      const data = memoryUpdateProfile(req.user.id, updates);
      return res.json(profileResponse(data));
    }

    const supabase = getSupabaseAdmin();
    const updates = { id: req.user.id };
    if (req.validatedData.display_name) updates.display_name = req.validatedData.display_name;
    if (req.validatedData.avatar_color) updates.avatar_color = req.validatedData.avatar_color;
    if (req.validatedData.avatar_url !== undefined) {
      updates.avatar_url = req.validatedData.avatar_url || null;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(updates)
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

router.post('/me/avatar', validate(uploadAvatarSchema), async (req, res) => {
  try {
    const { image_data: imageData } = req.validatedData;

    if (isMemoryMode()) {
      const data = memoryUpdateProfile(req.user.id, { avatar_url: imageData });
      return res.json(profileResponse(data));
    }

    const supabase = getSupabaseAdmin();
    let avatarUrl;

    try {
      avatarUrl = await uploadAvatarToStorage(supabase, req.user.id, imageData);
    } catch (storageErr) {
      console.warn('[PROFILE AVATAR] Storage upload failed, saving inline:', storageErr.message);
      decodeImageData(imageData);
      avatarUrl = imageData;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ id: req.user.id, avatar_url: avatarUrl })
      .select()
      .single();

    if (error) return handleDatabaseError(error, res);

    let profile = data;
    if (!profile.nomor_id) {
      profile = await ensureNomorId(supabase, req.user.id, profile);
    }

    res.json(profileResponse(profile));
  } catch (err) {
    console.error('[PROFILE AVATAR]', err);
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Gagal mengunggah foto profil' });
  }
});

export default router;
