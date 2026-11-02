-- ═══════════════════════════════════════════════════════════════════
-- WORKHOP HYPERLOCAL GIG PLATFORM - REAL GOOGLE OAUTH & PROFILES TRIGGER
-- Project: kdfrbkxpuwbrvhidihvj (ap-northeast-2 Seoul)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Automatic Profile Trigger on real Supabase auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    detected_name TEXT;
    detected_avatar TEXT;
    is_verified BOOLEAN;
BEGIN
    -- Extract name and avatar from Google OAuth user_metadata
    detected_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );
    detected_avatar := COALESCE(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture'
    );
    -- Verified status comes strictly from real Supabase / Google auth
    is_verified := (new.email_confirmed_at IS NOT NULL);

    INSERT INTO public.profiles (
        id,
        email,
        name,
        avatar_url,
        phone_verified,
        hops_balance,
        role,
        area,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(detected_name, 'Member'),
        detected_avatar,
        is_verified,
        50,
        COALESCE(new.raw_user_meta_data->>'role', 'freelancer'),
        COALESCE(new.raw_user_meta_data->>'area', 'Bengaluru'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        name = COALESCE(public.profiles.name, EXCLUDED.name),
        phone_verified = (EXCLUDED.phone_verified OR public.profiles.phone_verified),
        updated_at = NOW();

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Ensure RLS Policies for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read of profiles for hiring and browsing
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);

-- Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update ONLY their own profile without self-elevating to admin
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        (role != 'admin' OR role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    );
