-- ═══════════════════════════════════════════════════════════════════
-- WORKHOP HYPERLOCAL GIG PLATFORM - PROFESSION & TAB SUGGESTIONS
-- Project: kdfrbkxpuwbrvhidihvj (ap-northeast-2 Seoul)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profession_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profession TEXT NOT NULL,
    category_hint TEXT DEFAULT 'General',
    description TEXT,
    user_role TEXT DEFAULT 'freelancer' CHECK (user_role IN ('freelancer', 'employer', 'visitor')),
    user_email TEXT,
    user_phone TEXT,
    area TEXT DEFAULT 'Bengaluru',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'tab_added', 'archived')),
    request_count INT DEFAULT 1,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching and deduplication
CREATE INDEX IF NOT EXISTS idx_prof_sug_profession ON public.profession_suggestions(profession);
CREATE INDEX IF NOT EXISTS idx_prof_sug_status ON public.profession_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_prof_sug_created_at ON public.profession_suggestions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.profession_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/anon/authenticated) to insert suggestions
DROP POLICY IF EXISTS "Public insert suggestions" ON public.profession_suggestions;
CREATE POLICY "Public insert suggestions" ON public.profession_suggestions FOR INSERT WITH CHECK (true);

-- Allow public read of suggestions
DROP POLICY IF EXISTS "Public select suggestions" ON public.profession_suggestions;
CREATE POLICY "Public select suggestions" ON public.profession_suggestions FOR SELECT USING (true);

-- Allow updates (for admins)
DROP POLICY IF EXISTS "Allow update suggestions" ON public.profession_suggestions;
CREATE POLICY "Allow update suggestions" ON public.profession_suggestions FOR UPDATE USING (true);
