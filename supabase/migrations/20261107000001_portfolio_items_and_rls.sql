-- ═══════════════════════════════════════════════════════════════════════
-- WORKHOP HYPERLOCAL MARKETPLACE - PORTFOLIO ITEMS MIGRATION & RLS
-- Migration: 06_portfolio_items_table_and_rls.sql
-- ═══════════════════════════════════════════════════════════════════════

-- STEP 1: CREATE portfolio_items TABLE
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT CHECK (char_length(title) <= 200),
  description TEXT CHECK (char_length(description) <= 2000),
  storage_path TEXT NOT NULL CHECK (char_length(storage_path) <= 1000),
  external_url TEXT CHECK (char_length(external_url) <= 1000),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant lookup by freelancer
CREATE INDEX IF NOT EXISTS idx_portfolio_items_freelancer_id ON public.portfolio_items (freelancer_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_sort_order ON public.portfolio_items (freelancer_id, sort_order ASC, created_at DESC);

-- Trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_portfolio_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_portfolio_items_timestamp ON public.portfolio_items;
CREATE TRIGGER set_portfolio_items_timestamp
BEFORE UPDATE ON public.portfolio_items
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_portfolio_item_timestamp();

-- Enable RLS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- STEP 2: ADMIN HELPER FUNCTION (Security Definer)
-- Checks whether caller is an admin based on auth.jwt email or role
CREATE OR REPLACE FUNCTION public.is_workhop_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (
    LOWER(COALESCE(auth.jwt()->>'email', '')) IN (
      'ayaanwann@gmail.com',
      'zenithdeveloperss@gmail.com',
      'zenithdeveleoperss@gmail.com',
      'manarastudio22@gmail.com',
      'alia.m@cobblestonedesigns.in'
    )
    OR (auth.jwt()->'app_metadata'->>'role') = 'admin'
    OR (auth.jwt()->'user_metadata'->>'role') = 'admin'
    OR (auth.jwt()->'user_metadata'->>'is_admin')::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- STEP 3: RLS POLICIES ON portfolio_items

-- 1. SELECT Policy:
-- - Freelancer can view their own items (even while pending)
-- - Admins can view all items (including pending freelancers)
-- - Authenticated employers and public can view items for all registered freelancers
DROP POLICY IF EXISTS "Allow select portfolio items" ON public.portfolio_items;
CREATE POLICY "Allow select portfolio items"
  ON public.portfolio_items FOR SELECT
  USING (
    -- Admin sees everything
    public.is_workhop_admin()
    -- Freelancer sees their own
    OR auth.uid() = freelancer_id
    -- Approved freelancers or all active talent feed items visible
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = portfolio_items.freelancer_id
        AND p.role = 'freelancer'
    )
    OR auth.role() = 'anon'
    OR auth.role() = 'service_role'
  );

-- 2. INSERT Policy: Freelancers can only insert rows where freelancer_id = auth.uid() (or service_role)
DROP POLICY IF EXISTS "Allow insert own portfolio items" ON public.portfolio_items;
CREATE POLICY "Allow insert own portfolio items"
  ON public.portfolio_items FOR INSERT
  WITH CHECK (
    auth.uid() = freelancer_id
    OR public.is_workhop_admin()
    OR auth.role() = 'service_role'
  );

-- 3. UPDATE Policy: Freelancers can only update their own rows
DROP POLICY IF EXISTS "Allow update own portfolio items" ON public.portfolio_items;
CREATE POLICY "Allow update own portfolio items"
  ON public.portfolio_items FOR UPDATE
  USING (
    auth.uid() = freelancer_id
    OR public.is_workhop_admin()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.uid() = freelancer_id
    OR public.is_workhop_admin()
    OR auth.role() = 'service_role'
  );

-- 4. DELETE Policy: Freelancers can only delete their own rows
DROP POLICY IF EXISTS "Allow delete own portfolio items" ON public.portfolio_items;
CREATE POLICY "Allow delete own portfolio items"
  ON public.portfolio_items FOR DELETE
  USING (
    auth.uid() = freelancer_id
    OR public.is_workhop_admin()
    OR auth.role() = 'service_role'
  );

-- STEP 4: STORAGE OBJECTS RLS FOR 'portfolios' BUCKET
-- Public read is enabled because bucket is public.
-- Freelancers can upload/delete only in their own folder (auth.uid()).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Allow public view of portfolio images'
  ) THEN
    CREATE POLICY "Allow public view of portfolio images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'portfolios');
  END IF;
END $$;

DROP POLICY IF EXISTS "Allow users to upload own portfolio objects" ON storage.objects;
CREATE POLICY "Allow users to upload own portfolio objects"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolios'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR auth.role() = 'service_role'
      OR public.is_workhop_admin()
    )
  );

DROP POLICY IF EXISTS "Allow users to delete own portfolio objects" ON storage.objects;
CREATE POLICY "Allow users to delete own portfolio objects"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolios'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR auth.role() = 'service_role'
      OR public.is_workhop_admin()
    )
  );

-- STEP 5: ENABLE REALTIME ON portfolio_items
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_items;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

-- STEP 6: BACKFILL FROM EXISTING STORAGE OBJECTS
-- Maps existing files in storage.objects ('d92f3c8b-c0e9-4382-90f3-e12b16386714/...') into portfolio_items
DO $$
DECLARE
  rec RECORD;
  v_user_id UUID;
BEGIN
  FOR rec IN
    SELECT name, created_at, (metadata->>'size')::int as f_size
    FROM storage.objects
    WHERE bucket_id = 'portfolios'
  LOOP
    BEGIN
      -- Extract user_id from path: {user_id}/{filename}
      v_user_id := (SPLIT_PART(rec.name, '/', 1))::UUID;
      
      -- Only insert if profile exists and no row exists for this path yet
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        INSERT INTO public.portfolio_items (freelancer_id, title, storage_path, created_at)
        VALUES (v_user_id, 'Project Sample', rec.name, rec.created_at)
        ON CONFLICT DO NOTHING;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        NULL; -- Ignore malformed paths
    END;
  END LOOP;
END $$;
