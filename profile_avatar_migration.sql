-- ============================================================
-- Profil: foto profil (avatar_url) + bucket storage
-- Jalankan di Supabase → SQL Editor → Run
-- ============================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
