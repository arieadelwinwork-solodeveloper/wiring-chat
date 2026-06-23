-- ============================================================
-- FIX: "Database error saving new user" saat daftar akun
-- Jalankan di Supabase → SQL Editor → Run
-- ============================================================

-- Pastikan tabel profil ada (aman di-run ulang)
CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_color  TEXT NOT NULL DEFAULT '#0a2540',
  role          user_role NOT NULL DEFAULT 'user',
  nomor_id      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_display_name_not_empty CHECK (char_length(trim(display_name)) > 0)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Trigger yang lebih aman (hindari cast enum gagal & nama kosong)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_name TEXT;
  profile_role public.user_role := 'user';
  meta_role TEXT;
BEGIN
  profile_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(trim(split_part(NEW.email, '@', 1)), ''),
    'Pengguna'
  );

  meta_role := NEW.raw_user_meta_data->>'role';
  IF meta_role IN ('owner', 'user') THEN
    profile_role := meta_role::public.user_role;
  END IF;

  INSERT INTO public.user_profiles (id, display_name, avatar_color, role, nomor_id)
  VALUES (
    NEW.id,
    profile_name,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'avatar_color'), ''), '#0a2540'),
    profile_role,
    'USR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Izin agar trigger auth bisa menulis ke public.user_profiles
GRANT USAGE ON SCHEMA public TO postgres, supabase_auth_admin;
GRANT ALL ON TABLE public.user_profiles TO postgres, supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, supabase_auth_admin;

-- RLS: user boleh baca & ubah profil sendiri
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
