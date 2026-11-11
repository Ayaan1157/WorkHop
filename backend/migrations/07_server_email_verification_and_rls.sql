-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION 07: PROPER SERVER-SIDE EMAIL VERIFICATION & RLS ENFORCEMENT
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Security-definer helper to check if the current user's email is confirmed
CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE id = auth.uid()),
    false
  );
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.is_email_verified() TO authenticated, service_role;

-- 2. Prevent users from editing their own role, admin flag, or hops balance from the client
-- Only allow updating safe profile fields (name, phone, bio, skill, category, area, portfolio, avatar_url, etc.)
CREATE OR REPLACE FUNCTION public.protect_profile_privilege_fields()
RETURNS trigger AS $$
BEGIN
  -- If client tries to alter role, hops_balance, or id, preserve existing values unless service_role
  IF current_user <> 'service_role' THEN
    NEW.id := OLD.id;
    NEW.email := OLD.email;
    NEW.role := OLD.role;
    NEW.hops_balance := OLD.hops_balance;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_privilege_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privilege_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_privilege_fields();

-- 3. Require is_email_verified() for posting jobs
DROP POLICY IF EXISTS "Employer insert jobs" ON public.jobs;
CREATE POLICY "Employer insert jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    auth.uid() = employer_id 
    AND public.is_email_verified()
  );

DROP POLICY IF EXISTS "Employer update own jobs" ON public.jobs;
CREATE POLICY "Employer update own jobs" ON public.jobs
  FOR UPDATE USING (
    auth.uid() = employer_id 
    AND public.is_email_verified()
  );

-- 4. Require is_email_verified() for applying to jobs
DROP POLICY IF EXISTS "Freelancers insert application" ON public.applications;
CREATE POLICY "Freelancers insert application" ON public.applications
  FOR INSERT WITH CHECK (
    auth.uid() = freelancer_id 
    AND public.is_email_verified()
  );

-- 5. Require is_email_verified() for inserting messages
DROP POLICY IF EXISTS "Participants insert messages" ON public.messages;
CREATE POLICY "Participants insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    public.is_email_verified() AND
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id 
        AND (c.employer_id = auth.uid() OR c.freelancer_id = auth.uid())
    )
  );

-- 6. Require is_email_verified() for updating profile
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id 
    AND public.is_email_verified()
  );

-- 7. Normalize profile emails to lowercase and add unique index on lower(email) if not present
DO $$
BEGIN
  UPDATE public.profiles SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'profiles' AND indexname = 'idx_profiles_lower_email'
  ) THEN
    CREATE UNIQUE INDEX idx_profiles_lower_email ON public.profiles (LOWER(TRIM(email)));
  END IF;
END $$;
