-- Migration 05: Setup Portfolio Storage Bucket and RLS Policies

-- 1. Create 'portfolios' public storage bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolios',
  'portfolios',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. Storage Objects RLS: Allow anyone to view/read portfolio images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public read access for portfolio images'
  ) THEN
    CREATE POLICY "Public read access for portfolio images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'portfolios');
  END IF;
END $$;

-- 3. Storage Objects RLS: Allow authenticated users & anon uploads to portfolios bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Allow uploads to portfolios'
  ) THEN
    CREATE POLICY "Allow uploads to portfolios"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'portfolios');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Allow update to portfolios'
  ) THEN
    CREATE POLICY "Allow update to portfolios"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'portfolios');
  END IF;
END $$;

-- 4. Ensure public.profiles table has portfolio column and proper RLS
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS portfolio JSONB DEFAULT '[]'::jsonb;

-- Allow public read access to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND schemaname = 'public' 
    AND policyname = 'Allow public read profiles'
  ) THEN
    CREATE POLICY "Allow public read profiles"
      ON public.profiles FOR SELECT
      USING (true);
  END IF;
END $$;

-- Allow users to update their profile by matching auth.uid() or matching email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND schemaname = 'public' 
    AND policyname = 'Allow profile updates'
  ) THEN
    CREATE POLICY "Allow profile updates"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id OR auth.role() = 'service_role' OR auth.role() = 'anon');
  END IF;
END $$;
