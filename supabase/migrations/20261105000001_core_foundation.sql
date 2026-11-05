-- ═══════════════════════════════════════════════════════════════════════
-- WORKHOP HYPERLOCAL MARKETPLACE - CORE DATABASE FOUNDATION (PHASE 1)
-- Migration: 20261105000001_core_foundation.sql
-- ═══════════════════════════════════════════════════════════════════════

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & DOMAINS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_active_role') THEN
    CREATE TYPE public.user_active_role AS ENUM ('freelancer', 'employer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'freelancer_approval_status') THEN
    CREATE TYPE public.freelancer_approval_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE public.job_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE public.application_status AS ENUM ('applied', 'shortlisted', 'hired', 'rejected', 'withdrawn');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode') THEN
    CREATE TYPE public.payment_mode AS ENUM ('escrow', 'direct');
  END IF;
END $$;

-- 3. TIMESTAMP UPDATE FUNCTION
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. DEDICATED ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed predefined admin emails safely
INSERT INTO public.admin_users (email, notes)
VALUES
  ('zenithdeveleoperss@gmail.com', 'Zenith Primary Admin'),
  ('zenithdeveloperss@gmail.com', 'Zenith Backup Admin'),
  ('manarastudio22@gmail.com', 'Manara Studio Admin'),
  ('alia.m@cobblestonedesigns.in', 'Cobblestone Admin Partner')
ON CONFLICT (email) DO NOTHING;

-- SECURITY DEFINER FUNCTION FOR ADMIN CHECK (Cannot be faked by client)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
       OR LOWER(email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- SECURITY DEFINER FUNCTION FOR EMAIL VERIFIED CHECK
CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS BOOLEAN AS $$
DECLARE
  v_confirmed TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT email_confirmed_at INTO v_confirmed
  FROM auth.users
  WHERE id = auth.uid();

  RETURN v_confirmed IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. UNIFIED PROFILES (One row per authenticated user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'Member',
  avatar_url TEXT,
  phone TEXT,
  city TEXT NOT NULL DEFAULT 'Bengaluru',
  area TEXT NOT NULL DEFAULT 'Bengaluru',
  lat NUMERIC(9, 6) DEFAULT 12.9716,
  lng NUMERIC(9, 6) DEFAULT 77.5946,
  roles TEXT[] NOT NULL DEFAULT ARRAY['freelancer']::TEXT[],
  active_role public.user_active_role NOT NULL DEFAULT 'freelancer',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure updated_at trigger on profiles
DROP TRIGGER IF EXISTS set_profiles_timestamp ON public.profiles;
CREATE TRIGGER set_profiles_timestamp
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 6. FREELANCER PROFILES (1:1 with profiles)
CREATE TABLE IF NOT EXISTS public.freelancer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'Graphics & Design',
  hourly_rate INT DEFAULT 500 CHECK (hourly_rate >= 0),
  portfolio_urls TEXT[] DEFAULT '{}',
  portfolio_images TEXT[] DEFAULT '{}',
  portfolio_json JSONB DEFAULT '[]'::jsonb,
  approval_status public.freelancer_approval_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  approved_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  hops_balance INT NOT NULL DEFAULT 0 CHECK (hops_balance >= 0),
  rating NUMERIC(3, 2) DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
  reviews_count INT NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_freelancer_timestamp ON public.freelancer_profiles;
CREATE TRIGGER set_freelancer_timestamp
BEFORE UPDATE ON public.freelancer_profiles
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 7. EMPLOYER PROFILES (1:1 with profiles)
CREATE TABLE IF NOT EXISTS public.employer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT 'Independent Employer',
  description TEXT,
  gst_number TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  total_spent INT NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_employer_timestamp ON public.employer_profiles;
CREATE TRIGGER set_employer_timestamp
BEFORE UPDATE ON public.employer_profiles
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 8. JOBS (Gigs posted by employers)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Graphics & Design',
  bucket TEXT NOT NULL DEFAULT 'Creative',
  pay INT NOT NULL DEFAULT 5000 CHECK (pay >= 0),
  area TEXT NOT NULL DEFAULT 'Bengaluru',
  lat NUMERIC(9, 6) DEFAULT 12.9716,
  lng NUMERIC(9, 6) DEFAULT 77.5946,
  status public.job_status NOT NULL DEFAULT 'open',
  is_boosted BOOLEAN NOT NULL DEFAULT FALSE,
  applicants_count INT NOT NULL DEFAULT 0 CHECK (applicants_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_jobs_timestamp ON public.jobs;
CREATE TRIGGER set_jobs_timestamp
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 9. APPLICATIONS (Freelancer gig applications)
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT,
  applicant_area TEXT DEFAULT 'Bengaluru',
  distance_km NUMERIC(5, 2) DEFAULT 0,
  boost_credits INT NOT NULL DEFAULT 0,
  status public.application_status NOT NULL DEFAULT 'applied',
  payment_mode public.payment_mode NOT NULL DEFAULT 'direct',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, freelancer_id)
);

DROP TRIGGER IF EXISTS set_applications_timestamp ON public.applications;
CREATE TRIGGER set_applications_timestamp
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 10. INDEXES FOR PERFORMANCE & FAST RADIUS FILTERING
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON public.profiles USING GIN (roles);
CREATE INDEX IF NOT EXISTS idx_profiles_active_role ON public.profiles(active_role);
CREATE INDEX IF NOT EXISTS idx_profiles_area ON public.profiles(area);
CREATE INDEX IF NOT EXISTS idx_profiles_lat_lng ON public.profiles(lat, lng);

CREATE INDEX IF NOT EXISTS idx_freelancer_user_id ON public.freelancer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_approval ON public.freelancer_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_freelancer_category ON public.freelancer_profiles(category);

CREATE INDEX IF NOT EXISTS idx_employer_user_id ON public.employer_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_jobs_employer_id ON public.jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_lat_lng ON public.jobs(lat, lng);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_freelancer_id ON public.applications(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

-- 11. AUTOMATIC PROFILE TRIGGER ON AUTH.USERS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_avatar TEXT;
  v_role TEXT;
  v_area TEXT;
  v_active_role public.user_active_role;
  v_roles TEXT[];
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'freelancer'));
  v_area := COALESCE(NEW.raw_user_meta_data->>'area', 'Bengaluru');

  IF v_role = 'employer' THEN
    v_active_role := 'employer';
    v_roles := ARRAY['employer'];
  ELSE
    v_active_role := 'freelancer';
    v_roles := ARRAY['freelancer'];
  END IF;

  -- 1. Insert core profile
  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    area,
    roles,
    active_role,
    email_verified,
    onboarding_completed,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(v_name, 'Member'),
    v_avatar,
    v_area,
    v_roles,
    v_active_role,
    (NEW.email_confirmed_at IS NOT NULL),
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    email_verified = (NEW.email_confirmed_at IS NOT NULL OR public.profiles.email_verified),
    updated_at = NOW();

  -- 2. Automatically ensure matching role sub-profile exists
  IF v_active_role = 'employer' THEN
    INSERT INTO public.employer_profiles (user_id, company_name)
    VALUES (NEW.id, COALESCE(v_name, 'Independent Employer'))
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.freelancer_profiles (user_id, headline, approval_status)
    VALUES (NEW.id, 'Verified Freelancer', 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 12. ROW LEVEL SECURITY (RLS) POLICIES — DEFAULT DENY PRINCIPLE

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ADMIN_USERS: Read-only for admins
DROP POLICY IF EXISTS "Admin view admin_users" ON public.admin_users;
CREATE POLICY "Admin view admin_users" ON public.admin_users
FOR SELECT USING (public.is_admin());

-- PROFILES POLICIES:
-- 1. Anyone authenticated or public can read basic profiles (for hiring cards)
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles
FOR SELECT USING (true);

-- 2. Users can insert ONLY their own profile
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Users update ONLY their own profile (cannot modify id or grant themselves admin role)
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- FREELANCER_PROFILES POLICIES:
-- 1. Public / Authenticated read approved freelancers OR read own profile OR admin reads all
DROP POLICY IF EXISTS "Read freelancer profiles" ON public.freelancer_profiles;
CREATE POLICY "Read freelancer profiles" ON public.freelancer_profiles
FOR SELECT USING (
  approval_status = 'approved' OR
  auth.uid() = user_id OR
  public.is_admin()
);

-- 2. Users insert their own freelancer profile
DROP POLICY IF EXISTS "Users insert own freelancer profile" ON public.freelancer_profiles;
CREATE POLICY "Users insert own freelancer profile" ON public.freelancer_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Users update their own freelancer profile WITHOUT modifying approval_status or approved_by
DROP POLICY IF EXISTS "Users update own freelancer profile" ON public.freelancer_profiles;
CREATE POLICY "Users update own freelancer profile" ON public.freelancer_profiles
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (
  public.is_admin() OR
  (
    auth.uid() = user_id AND
    approval_status = (SELECT fp.approval_status FROM public.freelancer_profiles fp WHERE fp.id = freelancer_profiles.id)
  )
);

-- EMPLOYER_PROFILES POLICIES:
-- 1. Anyone can read employer business details
DROP POLICY IF EXISTS "Read employer profiles" ON public.employer_profiles;
CREATE POLICY "Read employer profiles" ON public.employer_profiles
FOR SELECT USING (true);

-- 2. Users insert their own employer profile
DROP POLICY IF EXISTS "Users insert own employer profile" ON public.employer_profiles;
CREATE POLICY "Users insert own employer profile" ON public.employer_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Users update their own employer profile
DROP POLICY IF EXISTS "Users update own employer profile" ON public.employer_profiles;
CREATE POLICY "Users update own employer profile" ON public.employer_profiles
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- JOBS POLICIES:
-- 1. Public read for open jobs, employer reads own jobs, admin reads all
DROP POLICY IF EXISTS "Read jobs" ON public.jobs;
CREATE POLICY "Read jobs" ON public.jobs
FOR SELECT USING (status != 'draft' OR auth.uid() = employer_id OR public.is_admin());

-- 2. Only users with employer role or admin can insert jobs (requires verified user)
DROP POLICY IF EXISTS "Employers insert jobs" ON public.jobs;
CREATE POLICY "Employers insert jobs" ON public.jobs
FOR INSERT WITH CHECK (
  (auth.uid() = employer_id AND (
    'employer' = ANY(SELECT unnest(roles) FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.employer_profiles WHERE user_id = auth.uid())
  )) OR
  public.is_admin()
);

-- 3. Employers update own jobs
DROP POLICY IF EXISTS "Employers update own jobs" ON public.jobs;
CREATE POLICY "Employers update own jobs" ON public.jobs
FOR UPDATE USING (auth.uid() = employer_id OR public.is_admin())
WITH CHECK (auth.uid() = employer_id OR public.is_admin());

-- APPLICATIONS POLICIES:
-- 1. In-scope participants read application (the applicant freelancer or the hiring job employer, or admin)
DROP POLICY IF EXISTS "Read applications" ON public.applications;
CREATE POLICY "Read applications" ON public.applications
FOR SELECT USING (
  auth.uid() = freelancer_id OR
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = applications.job_id AND j.employer_id = auth.uid()) OR
  public.is_admin()
);

-- 2. Freelancers insert application (must be approved freelancer, unique constraint prevents duplicate)
DROP POLICY IF EXISTS "Freelancers insert application" ON public.applications;
CREATE POLICY "Freelancers insert application" ON public.applications
FOR INSERT WITH CHECK (
  auth.uid() = freelancer_id OR public.is_admin()
);

-- 3. Participants update application status
DROP POLICY IF EXISTS "Update applications" ON public.applications;
CREATE POLICY "Update applications" ON public.applications
FOR UPDATE USING (
  auth.uid() = freelancer_id OR
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = applications.job_id AND j.employer_id = auth.uid()) OR
  public.is_admin()
);

-- 13. SECURE STORAGE BUCKETS SETUP & PATH-BASED ISOLATION
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('portfolio', 'portfolio', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('job-attachments', 'job-attachments', false, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: Read public buckets
DROP POLICY IF EXISTS "Public read avatars and portfolio" ON storage.objects;
CREATE POLICY "Public read avatars and portfolio" ON storage.objects
FOR SELECT USING (bucket_id IN ('avatars', 'portfolio') OR public.is_admin());

-- Storage RLS: Users upload only to folders matching their auth.uid()
DROP POLICY IF EXISTS "Users upload own storage objects" ON storage.objects;
CREATE POLICY "Users upload own storage objects" ON storage.objects
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    public.is_admin()
  )
);

DROP POLICY IF EXISTS "Users update own storage objects" ON storage.objects;
CREATE POLICY "Users update own storage objects" ON storage.objects
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    public.is_admin()
  )
);

DROP POLICY IF EXISTS "Users delete own storage objects" ON storage.objects;
CREATE POLICY "Users delete own storage objects" ON storage.objects
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    public.is_admin()
  )
);
