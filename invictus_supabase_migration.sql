-- ============================================================
-- INVICTUS FUTURE READINESS DIAGNOSTIC™ — SUPABASE MIGRATION
-- ============================================================
-- Run ALL of these queries in order inside your new Supabase
-- project's SQL Editor (Dashboard > SQL Editor > New Query).
--
-- ORDER:
--   1. Extensions
--   2. Tables
--   3. Triggers & Functions
--   4. Row Level Security (RLS) Policies
--   5. Storage Bucket
--   6. Seed: Admin User (manual step — see bottom)
-- ============================================================


-- ============================================================
-- STEP 1: ENABLE EXTENSIONS
-- ============================================================
-- uuid-ossp is needed for gen_random_uuid() used in triggers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- STEP 2: CREATE TABLES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: profiles
-- Stores all user profiles (admin, supervisor, participant)
-- Automatically populated via trigger on auth.users insert
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_id     TEXT UNIQUE,                     -- e.g. "P-20240619-1"
  email         TEXT,
  full_name     TEXT,
  preferred_name TEXT,
  phone_number  TEXT,
  role          TEXT DEFAULT 'participant',       -- 'admin' | 'supervisor' | 'participant'
  organization  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLE: organizations
-- Created by admin via the "Create Organisation" flow
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id        TEXT UNIQUE,                  -- e.g. "ORG-20240619-1"
  name             TEXT NOT NULL,
  signup_token     TEXT UNIQUE NOT NULL,          -- 8-digit random token for signup URL
  supervisor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  supervisor_name  TEXT,
  supervisor_email TEXT,
  max_participants INTEGER DEFAULT 0,             -- 0 = unlimited
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- TABLE: evaluations
-- Stores assessment responses per participant
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  responses           JSONB DEFAULT '{}',         -- All questionnaire answers
  status              TEXT DEFAULT 'in-progress', -- 'in-progress' | 'submitted'
  highest_part_index  INTEGER DEFAULT 0,          -- For save-and-resume progress
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  submitted_at        TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- TABLE: admin_reports
-- Stores admin feedback/reports sent to participants
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  summary_text      TEXT,
  report_file_url   TEXT,                         -- Public URL from Supabase storage
  created_at        TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- STEP 3: FUNCTIONS & TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- FUNCTION: handle_new_user
-- Automatically creates a profile row whenever a new user
-- signs up through Supabase Auth
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_prefix TEXT;
  next_seq     INT;
BEGIN
  -- Generate custom_id: e.g. PID-20240619-1
  today_prefix := 'PID-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';

  -- Find the highest sequence number used today and increment by 1
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(custom_id FROM LENGTH(today_prefix) + 1) AS INTEGER)
  ), 0) + 1
  INTO next_seq
  FROM public.profiles
  WHERE custom_id LIKE today_prefix || '%'
    AND custom_id ~ ('^' || today_prefix || '[0-9]+$');

  INSERT INTO public.profiles (
    id,
    full_name,
    preferred_name,
    phone_number,
    email,
    role,
    custom_id
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'preferred_name',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'participant'),
    today_prefix || next_seq
  );

  RETURN NEW;
END;
$$;

-- Attach trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- STEP 4: ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all tables first, then define policies below.


-- ------------------------------------------------------------
-- profiles: RLS
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all profiles (needed for admin dashboard)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Service role (used by API functions) bypasses RLS automatically,
-- so no insert policy for normal users is needed here since
-- the trigger runs as SECURITY DEFINER.


-- ------------------------------------------------------------
-- organizations: RLS
-- ------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read organizations
-- (needed for signup token validation and supervisor dashboard)
CREATE POLICY "orgs_select_authenticated"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (true);

-- Also allow anon reads for the signup page token lookup
CREATE POLICY "orgs_select_anon"
  ON public.organizations FOR SELECT
  TO anon
  USING (true);

-- Insert/Update/Delete are handled via service_role key in API functions
-- (create-org.js / update-org.js) — no client-side write policies needed.


-- ------------------------------------------------------------
-- evaluations: RLS
-- ------------------------------------------------------------
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Participants can read/write only their own evaluation
CREATE POLICY "evals_select_own"
  ON public.evaluations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "evals_insert_own"
  ON public.evaluations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "evals_update_own"
  ON public.evaluations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin/supervisor: can read ALL evaluations (for dashboard)
-- This is done via service_role in API calls, but we also allow
-- authenticated reads for the admin dashboard that uses the anon key.
-- If your admin dashboard fetches directly (not via API), enable this:
CREATE POLICY "evals_select_admin"
  ON public.evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'supervisor')
    )
  );


-- ------------------------------------------------------------
-- admin_reports: RLS
-- ------------------------------------------------------------
ALTER TABLE public.admin_reports ENABLE ROW LEVEL SECURITY;

-- Participants can read reports addressed to them
CREATE POLICY "reports_select_participant"
  ON public.admin_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = participant_id);

-- Admins can read all reports
CREATE POLICY "reports_select_admin"
  ON public.admin_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'supervisor')
    )
  );

-- Admins can insert reports
CREATE POLICY "reports_insert_admin"
  ON public.admin_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'supervisor')
    )
  );

-- Admins can update reports
CREATE POLICY "reports_update_admin"
  ON public.admin_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'supervisor')
    )
  );


-- ============================================================
-- STEP 5: STORAGE BUCKET
-- ============================================================
-- Create the "reports" bucket for uploaded PDF/report files.
-- Run this in SQL Editor:

INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (admins) to upload files
CREATE POLICY "reports_storage_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reports');

-- Allow public reads (so participants can download their reports)
CREATE POLICY "reports_storage_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'reports');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "reports_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'reports');


-- ============================================================
-- STEP 6: CREATE ADMIN USER (MANUAL STEP)
-- ============================================================
-- You cannot create users directly via SQL.
-- After running all the above queries, do the following:
--
-- OPTION A (Recommended — Supabase Dashboard):
--   1. Go to Authentication > Users > "Add User"
--   2. Enter the admin email and password
--   3. Click "Create User"
--   4. Then run the query below (replace the email):
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'YOUR_ADMIN_EMAIL_HERE';
--
-- OPTION B (via SQL with known UUID — if you already have the user):
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = 'PASTE-ADMIN-USER-UUID-HERE';


-- ============================================================
-- VERIFICATION QUERIES (run these to confirm setup)
-- ============================================================

-- Check all tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check trigger exists:
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'users';

-- Check storage bucket:
-- SELECT * FROM storage.buckets;
