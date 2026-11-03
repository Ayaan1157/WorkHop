-- ============================================================
-- WorkHop — Migration 04: Post-Google-OAuth Registration & Onboarding Fix
-- ============================================================

-- 1. Drop the auto-insert trigger so logging in with a never-registered
--    Google account does NOT auto-create a public.profiles row
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Add missing onboarding & status columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'incomplete',
  ADD COLUMN IF NOT EXISTS missing_fields JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS hiring_for TEXT,
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rate_hr NUMERIC DEFAULT 500,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- 3. Mark existing completed profiles as 'complete' so existing users are unaffected
UPDATE public.profiles
SET profile_status = 'complete'
WHERE (phone IS NOT NULL AND phone <> '')
   OR (skill IS NOT NULL AND skill <> '')
   OR (bio IS NOT NULL AND bio <> '');

-- 4. Case-insensitive email lookup index
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (LOWER(email));
