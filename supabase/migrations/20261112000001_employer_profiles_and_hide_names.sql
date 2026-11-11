-- ═══════════════════════════════════════════════════════════════════════
-- WORKHOP HYPERLOCAL MARKETPLACE: EMPLOYER PROFILES & PRIVACY ARCHITECTURE
-- Migration: 20261112000001_employer_profiles_and_hide_names.sql
-- ═══════════════════════════════════════════════════════════════════════

-- 1. EMPLOYER PROFILES TABLE (1:1 with profiles)
CREATE TABLE IF NOT EXISTS public.employer_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_category TEXT NOT NULL,
  business_type TEXT NOT NULL,
  about_business TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'Bengaluru',
  lat FLOAT8 NOT NULL DEFAULT 12.9716,
  lng FLOAT8 NOT NULL DEFAULT 77.5946,
  typical_help_needed TEXT[] NOT NULL DEFAULT '{}',
  team_size TEXT,
  public_label TEXT NOT NULL,
  completion_status TEXT NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PRIVATE DETAILS TABLE (Admin only for disputes/verification)
CREATE TABLE IF NOT EXISTS public.employer_private_details (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  private_business_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_private_details ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR employer_profiles
-- Employer can read and update their own record
DROP POLICY IF EXISTS "Employers can view own profile" ON public.employer_profiles;
CREATE POLICY "Employers can view own profile"
  ON public.employer_profiles
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Employers can insert own profile" ON public.employer_profiles;
CREATE POLICY "Employers can insert own profile"
  ON public.employer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Employers can update own profile" ON public.employer_profiles;
CREATE POLICY "Employers can update own profile"
  ON public.employer_profiles
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Admins can view and manage all employer profiles
DROP POLICY IF EXISTS "Admins have full access to employer profiles" ON public.employer_profiles;
CREATE POLICY "Admins have full access to employer profiles"
  ON public.employer_profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 5. RLS POLICIES FOR employer_private_details (Strictly Admin only)
DROP POLICY IF EXISTS "Admins have full access to employer private details" ON public.employer_private_details;
CREATE POLICY "Admins have full access to employer private details"
  ON public.employer_private_details
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 6. PUBLIC VIEW FOR FREELANCERS / VISITORS (Never exposes business name)
DROP VIEW IF EXISTS public.public_employer_cards CASCADE;
CREATE OR REPLACE VIEW public.public_employer_cards AS
SELECT
  ep.profile_id,
  ep.public_label,
  ep.business_category,
  ep.business_type,
  ep.about_business,
  ep.area,
  ep.lat,
  ep.lng,
  ep.typical_help_needed,
  ep.team_size,
  ep.completion_status,
  p.rating,
  p.reviews_count,
  p.created_at
FROM public.employer_profiles ep
JOIN public.profiles p ON ep.profile_id = p.id
WHERE ep.completion_status = 'completed';

GRANT SELECT ON public.public_employer_cards TO anon, authenticated;

-- 7. CLEAN UP JOBS TABLE: Populate public_label and remove business name visibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'public_label'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN public_label TEXT;
  END IF;
END $$;

UPDATE public.jobs
SET public_label = COALESCE(
  category || ' Client in ' || area,
  'Bengaluru Business in ' || area,
  'Verified Client in Bengaluru'
)
WHERE public_label IS NULL OR public_label = '';

