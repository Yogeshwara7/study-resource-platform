-- =============================================
-- Study Resource Platform — Supabase Setup
-- Run this in Supabase → SQL Editor
-- =============================================

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  subject       TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('pdf','note','link')),
  file_url      TEXT DEFAULT '',
  link_url      TEXT DEFAULT '',
  downloads     INTEGER DEFAULT 0,
  uploaded_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_name TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view resources"    ON resources FOR SELECT USING (true);
CREATE POLICY "Auth users can upload"        ON resources FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Owner can delete resource"    ON resources FOR DELETE USING (auth.uid() = uploaded_by);
CREATE POLICY "Anyone can update downloads"  ON resources FOR UPDATE USING (true);

-- Storage bucket (run manually in Supabase → Storage → New bucket)
-- Bucket name: study-files | Public: true

-- Demo accounts
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, aud, role
)
SELECT
  gen_random_uuid(), 'admin@demo.com',
  crypt('Admin@123', gen_salt('bf')),
  NOW(), '{"full_name":"Demo Admin","role":"admin"}'::jsonb,
  NOW(), NOW(), 'authenticated', 'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@demo.com'
);

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, aud, role
)
SELECT
  gen_random_uuid(), 'student@demo.com',
  crypt('Student@123', gen_salt('bf')),
  NOW(), '{"full_name":"Demo Student","role":"student"}'::jsonb,
  NOW(), NOW(), 'authenticated', 'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'student@demo.com'
);
