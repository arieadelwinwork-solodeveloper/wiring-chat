-- ============================================================
-- Chat Module Schema v2 — Supabase
-- Jalankan SELURUH file ini di SQL Editor (Ctrl+A → Run)
-- Jangan potong/copy sebagian — tiap CREATE TABLE harus lengkap
-- ============================================================

-- ------------------------------------------------------------
-- ENUM types (skip jika sudah ada — aman di-run ulang)
-- ------------------------------------------------------------
DO $$ BEGIN CREATE TYPE chat_room_type AS ENUM ('internal', 'customer_support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE room_subtype AS ENUM ('standard', 'group', 'contact', 'bot_faq', 'bot_ai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE message_sender_role AS ENUM ('customer', 'staff', 'ai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE contact_status AS ENUM ('owner', 'user', 'bot', 'ai_assistant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE bot_type AS ENUM ('faq', 'ai_assistant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('owner', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ai_response_mode AS ENUM ('always', 'on_code', 'interval');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE knowledge_file_type AS ENUM ('word', 'excel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- Profil pengguna (display name, avatar, role)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Tabel: chat_rooms
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_room     TEXT NOT NULL,
  tipe          chat_room_type NOT NULL DEFAULT 'internal',
  subtype       room_subtype NOT NULL DEFAULT 'standard',
  owner_id      UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  avatar_color  TEXT,
  config        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chat_rooms_nama_room_not_empty CHECK (char_length(trim(nama_room)) > 0)
);

-- Migrasi v1 → v2: chat_rooms lama tidak punya subtype, avatar_color, config
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS subtype room_subtype NOT NULL DEFAULT 'standard';
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS avatar_color TEXT;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN chat_rooms.subtype IS 'standard | group | contact | bot_faq | bot_ai';
COMMENT ON COLUMN chat_rooms.config IS 'JSON: group AI config, bot metadata, dll.';

-- ------------------------------------------------------------
-- Anggota ruangan (grup & DM)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_room_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES chat_rooms (id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  contact_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chat_room_members_has_member CHECK (user_id IS NOT NULL OR contact_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_room_members_user ON chat_room_members (room_id, user_id)
  WHERE user_id IS NOT NULL;

-- ------------------------------------------------------------
-- Kontak (mengundang teman)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  nama            TEXT NOT NULL,
  nomor_id        TEXT NOT NULL,
  status          contact_status NOT NULL DEFAULT 'user',
  linked_user_id  UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  room_id         UUID REFERENCES chat_rooms (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT contacts_nama_not_empty CHECK (char_length(trim(nama)) > 0),
  CONSTRAINT contacts_nomor_id_not_empty CHECK (char_length(trim(nomor_id)) > 0)
);

ALTER TABLE chat_room_members
  DROP CONSTRAINT IF EXISTS chat_room_members_contact_id_fkey;

ALTER TABLE chat_room_members
  ADD CONSTRAINT chat_room_members_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE;

-- ------------------------------------------------------------
-- Bot (FAQ & AI Assistant)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_bots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  bot_type    bot_type NOT NULL,
  nama        TEXT NOT NULL,
  kode_id     TEXT,
  llm         TEXT,
  room_id     UUID REFERENCES chat_rooms (id) ON DELETE SET NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chat_bots_nama_not_empty CHECK (char_length(trim(nama)) > 0)
);

-- FAQ categories (bot_id → chat_bots, lalu name & sort_order WAJIB ada)
CREATE TABLE IF NOT EXISTS faq_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id      UUID NOT NULL REFERENCES chat_bots (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faq_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id       UUID NOT NULL REFERENCES chat_bots (id) ON DELETE CASCADE,
  category_id  UUID REFERENCES faq_categories (id) ON DELETE SET NULL,
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id         UUID REFERENCES chat_bots (id) ON DELETE CASCADE,
  room_id        UUID REFERENCES chat_rooms (id) ON DELETE CASCADE,
  file_name      TEXT NOT NULL,
  file_type      knowledge_file_type NOT NULL,
  file_size      BIGINT NOT NULL DEFAULT 0,
  storage_path   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Tabel: messages
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES chat_rooms (id) ON DELETE CASCADE,
  sender_id    UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  sender_role  message_sender_role NOT NULL,
  sender_name  TEXT,
  teks_pesan   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT messages_teks_pesan_not_empty CHECK (char_length(trim(teks_pesan)) > 0)
);

-- Migrasi v1 → v2: kolom sender_name untuk tampilan bubble chat
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles (role);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_owner_id ON chat_rooms (owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_subtype ON chat_rooms (subtype);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room ON chat_room_members (room_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts (owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_bots_owner_id ON chat_bots (owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages (room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_items_bot_id ON faq_items (bot_id);

-- ------------------------------------------------------------
-- Auto-update updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER trg_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_chat_bots_updated_at ON chat_bots;
CREATE TRIGGER trg_chat_bots_updated_at
  BEFORE UPDATE ON chat_bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- Supabase Realtime
-- ------------------------------------------------------------
-- Realtime (abaikan error jika sudah ditambahkan)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- Row Level Security (RLS)
-- ------------------------------------------------------------
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- user_profiles
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

-- chat_rooms: owner atau anggota grup
DROP POLICY IF EXISTS "Users can view accessible rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Staff dapat melihat ruangan internal" ON chat_rooms;
CREATE POLICY "Users can view accessible rooms"
  ON chat_rooms FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = chat_rooms.id AND m.user_id = auth.uid()
    )
    OR subtype IN ('bot_faq', 'bot_ai')
      AND owner_id IN (SELECT owner_id FROM contacts WHERE linked_user_id = auth.uid())
    OR tipe = 'internal' AND subtype = 'standard'
  );

DROP POLICY IF EXISTS "Owner can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Pengguna dapat membuat ruangan" ON chat_rooms;
CREATE POLICY "Owner can create rooms"
  ON chat_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can update own rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Pemilik dapat mengubah ruangannya" ON chat_rooms;
CREATE POLICY "Owner can update own rooms"
  ON chat_rooms FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

-- chat_room_members
DROP POLICY IF EXISTS "Members can view room membership" ON chat_room_members;
CREATE POLICY "Members can view room membership"
  ON chat_room_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms r
      WHERE r.id = chat_room_members.room_id
        AND (r.owner_id = auth.uid() OR chat_room_members.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owner can manage room members" ON chat_room_members;
CREATE POLICY "Owner can manage room members"
  ON chat_room_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms r
      WHERE r.id = chat_room_members.room_id AND r.owner_id = auth.uid()
    )
  );

-- contacts
DROP POLICY IF EXISTS "Owner can manage contacts" ON contacts;
CREATE POLICY "Owner can manage contacts"
  ON contacts FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Linked user can view contact" ON contacts;
CREATE POLICY "Linked user can view contact"
  ON contacts FOR SELECT TO authenticated
  USING (linked_user_id = auth.uid());

-- chat_bots
DROP POLICY IF EXISTS "Owner can manage bots" ON chat_bots;
CREATE POLICY "Owner can manage bots"
  ON chat_bots FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view owner bots" ON chat_bots;
CREATE POLICY "Users can view owner bots"
  ON chat_bots FOR SELECT TO authenticated
  USING (true);

-- faq & knowledge (via bot ownership)
DROP POLICY IF EXISTS "Owner manages faq categories" ON faq_categories;
CREATE POLICY "Owner manages faq categories"
  ON faq_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM chat_bots b WHERE b.id = faq_categories.bot_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM chat_bots b WHERE b.id = faq_categories.bot_id AND b.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can read faq categories" ON faq_categories;
CREATE POLICY "Anyone can read faq categories"
  ON faq_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owner manages faq items" ON faq_items;
CREATE POLICY "Owner manages faq items"
  ON faq_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM chat_bots b WHERE b.id = faq_items.bot_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM chat_bots b WHERE b.id = faq_items.bot_id AND b.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can read faq items" ON faq_items;
CREATE POLICY "Anyone can read faq items"
  ON faq_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owner manages knowledge files" ON knowledge_files;
CREATE POLICY "Owner manages knowledge files"
  ON knowledge_files FOR ALL TO authenticated
  USING (
    (bot_id IS NOT NULL AND EXISTS (SELECT 1 FROM chat_bots b WHERE b.id = knowledge_files.bot_id AND b.owner_id = auth.uid()))
    OR (room_id IS NOT NULL AND EXISTS (SELECT 1 FROM chat_rooms r WHERE r.id = knowledge_files.room_id AND r.owner_id = auth.uid()))
  )
  WITH CHECK (
    (bot_id IS NOT NULL AND EXISTS (SELECT 1 FROM chat_bots b WHERE b.id = knowledge_files.bot_id AND b.owner_id = auth.uid()))
    OR (room_id IS NOT NULL AND EXISTS (SELECT 1 FROM chat_rooms r WHERE r.id = knowledge_files.room_id AND r.owner_id = auth.uid()))
  );

-- messages
DROP POLICY IF EXISTS "Users can read messages in accessible rooms" ON messages;
DROP POLICY IF EXISTS "Staff dapat membaca pesan internal" ON messages;
CREATE POLICY "Users can read messages in accessible rooms"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms r
      WHERE r.id = messages.room_id
        AND (
          r.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = r.id AND m.user_id = auth.uid())
          OR r.tipe = 'internal'
        )
    )
  );

DROP POLICY IF EXISTS "Users can send staff messages" ON messages;
DROP POLICY IF EXISTS "Staff dapat mengirim pesan" ON messages;
CREATE POLICY "Users can send staff messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_role IN ('staff', 'ai')
    AND EXISTS (
      SELECT 1 FROM chat_rooms r
      WHERE r.id = messages.room_id
        AND (
          r.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = r.id AND m.user_id = auth.uid())
          OR r.tipe = 'internal'
        )
    )
  );

-- ------------------------------------------------------------
-- Trigger: auto-create profile on signup
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_name TEXT;
  profile_role user_role := 'user';
  meta_role TEXT;
BEGIN
  profile_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(trim(split_part(NEW.email, '@', 1)), ''),
    'Pengguna'
  );

  meta_role := NEW.raw_user_meta_data->>'role';
  IF meta_role IN ('owner', 'user') THEN
    profile_role := meta_role::user_role;
  END IF;

  INSERT INTO public.user_profiles (id, display_name, avatar_color, role)
  VALUES (
    NEW.id,
    profile_name,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'avatar_color'), ''), '#0a2540'),
    profile_role
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
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

GRANT USAGE ON SCHEMA public TO postgres, supabase_auth_admin;
GRANT ALL ON TABLE public.user_profiles TO postgres, supabase_auth_admin;
