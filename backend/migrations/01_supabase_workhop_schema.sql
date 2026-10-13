-- ═══════════════════════════════════════════════════════════════════
-- WORKHOP HYPERLOCAL GIG PLATFORM - SUPABASE SCHEMA MIGRATION
-- Project: kdfrbkxpuwbrvhidihvj (ap-northeast-2 Seoul)
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    phone TEXT,
    name TEXT NOT NULL DEFAULT 'Member',
    role TEXT NOT NULL DEFAULT 'freelancer' CHECK (role IN ('freelancer', 'employer', 'admin')),
    bio TEXT,
    skill TEXT,
    category TEXT DEFAULT 'AI & Smart Automations',
    area TEXT DEFAULT 'Bengaluru',
    lat NUMERIC DEFAULT 12.9716,
    lng NUMERIC DEFAULT 77.5946,
    portfolio TEXT,
    rating NUMERIC DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    total_hires INT DEFAULT 0,
    total_spent_bucket TEXT DEFAULT '₹0 spent',
    hops_balance INT DEFAULT 50,
    phone_verified BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. JOBS (Gigs posted by employers)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    employer_name TEXT NOT NULL,
    company_name TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'AI & Smart Automations',
    bucket TEXT NOT NULL DEFAULT 'Tech' CHECK (bucket IN ('Tech', 'Creative', 'Marketing', 'Ops')),
    pay INT NOT NULL DEFAULT 5000,
    area TEXT NOT NULL DEFAULT 'Bengaluru',
    lat NUMERIC DEFAULT 12.9716,
    lng NUMERIC DEFAULT 77.5946,
    keywords TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'closed')),
    is_boosted BOOLEAN DEFAULT FALSE,
    applicants_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. APPLICATIONS (Freelancer gig applications)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    note TEXT,
    applicant_area TEXT DEFAULT 'Bengaluru',
    distance_km NUMERIC DEFAULT 0,
    boost_credits INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'shortlisted', 'hired', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, freelancer_id)
);

-- 4. CONVERSATIONS & CHATS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hired', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, employer_id, freelancer_id)
);

-- 5. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('freelancer', 'employer', 'admin', 'system')),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REVIEWS & RATINGS (Bidirectional: Employer <-> Freelancer)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('freelancer', 'employer')),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. WALLET & CREDIT TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('signup_bonus', 'pack_purchase', 'application_boost', 'lead_unlock', 'refund')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. GRIEVANCES & TICKETS
CREATE TABLE IF NOT EXISTS public.grievances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES FOR FAST HYPERLOCAL & TAXONOMY SEARCH
-- ══════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_area ON public.jobs(area);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_category ON public.profiles(category);
CREATE INDEX IF NOT EXISTS idx_profiles_area ON public.profiles(area);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, own profile update
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Jobs: Public read open jobs, employer insert/update own jobs
DROP POLICY IF EXISTS "Public jobs read" ON public.jobs;
CREATE POLICY "Public jobs read" ON public.jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Employer insert jobs" ON public.jobs;
CREATE POLICY "Employer insert jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = employer_id OR employer_id IS NULL);

DROP POLICY IF EXISTS "Employer update own jobs" ON public.jobs;
CREATE POLICY "Employer update own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = employer_id);

-- Applications: Freelancers insert, involved users view
DROP POLICY IF EXISTS "Applications read for participants" ON public.applications;
CREATE POLICY "Applications read for participants" ON public.applications FOR SELECT USING (
    auth.uid() = freelancer_id OR
    EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = applications.job_id AND jobs.employer_id = auth.uid())
);

DROP POLICY IF EXISTS "Freelancers insert application" ON public.applications;
CREATE POLICY "Freelancers insert application" ON public.applications FOR INSERT WITH CHECK (auth.uid() = freelancer_id);

-- Conversations & Messages
DROP POLICY IF EXISTS "Participants read conversations" ON public.conversations;
CREATE POLICY "Participants read conversations" ON public.conversations FOR SELECT USING (
    auth.uid() = employer_id OR auth.uid() = freelancer_id
);

DROP POLICY IF EXISTS "Participants read messages" ON public.messages;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id 
        AND (c.employer_id = auth.uid() OR c.freelancer_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Participants insert messages" ON public.messages;
CREATE POLICY "Participants insert messages" ON public.messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id 
        AND (c.employer_id = auth.uid() OR c.freelancer_id = auth.uid())
    )
);

-- Reviews: Public read
DROP POLICY IF EXISTS "Public reviews read" ON public.reviews;
CREATE POLICY "Public reviews read" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert reviews" ON public.reviews;
CREATE POLICY "Users insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ═══════════════════════════════════════════════════════════════════
-- REALTIME REPLICATION (For live chat and instant gig alerts)
-- ══════════════════════════════════════════════════
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- SEED INITIAL DATA (Bangalore AI & Smart Automations Gigs)
-- ══════════════════════════════════════════════════
INSERT INTO public.jobs (title, description, category, bucket, pay, employer_name, company_name, area, lat, lng, keywords)
VALUES
('Build WhatsApp Customer Support Bot with Botpress & ManyChat', 'Connect WhatsApp Business API with Botpress for 24/7 menu inquiries, order tracking, and table booking. Need live deployment in 5 days.', 'AI & Smart Automations', 'Tech', 18000, 'Rohan Deshmukh · ChaiCraft D2C', 'ChaiCraft D2C', 'Indiranagar', 12.9784, 77.6408, ARRAY['AI & Smart Automations', 'AI WhatsApp & Customer Support Chatbots', 'whatsapp bot', 'botpress', 'manychat', 'interakt', 'customer support bot']),
('No-Code Workflow Automation with n8n and Make.com', 'Sync Shopify orders to Google Sheets, send automated WhatsApp delivery notifications via Interakt, and trigger inventory alerts in Slack.', 'AI & Smart Automations', 'Tech', 16500, 'Priya Nair · UrbanRoots Organics', 'UrbanRoots Organics', 'Koramangala', 12.9352, 77.6245, ARRAY['AI & Smart Automations', 'No-Code Workflow Automation', 'n8n', 'make.com', 'zapier', 'workflow automation', 'crm sync']),
('AI UGC & Faceless Video Reel Creation for D2C Brand', 'Generate 12 high-converting Instagram reels using HeyGen avatars, ElevenLabs realistic voiceovers, and dynamic CapCut captions for festive sale.', 'AI & Smart Automations', 'Tech', 14000, 'Tanvi Rao · GlowAura Skincare', 'GlowAura Skincare', 'HSR Layout', 12.9121, 77.6446, ARRAY['AI & Smart Automations', 'AI UGC & Reel Generation', 'heygen', 'elevenlabs', 'ai ugc', 'faceless reels', 'ai video', 'ai reels']),
('AI Product & Packshot Photography with Midjourney', 'Create 20 ultra-realistic studio mockup packshots for coffee bags with lifestyle cafe backgrounds and studio lighting using Midjourney / Leonardo.ai.', 'AI & Smart Automations', 'Tech', 11000, 'Vikram Sen · Moksha Artisan Roasters', 'Moksha Artisan Roasters', 'Whitefield', 12.9698, 77.7499, ARRAY['AI & Smart Automations', 'AI Product & Studio Photography', 'midjourney', 'dall-e', 'leonardo.ai', 'ai packshot', 'studio mockup']),
('3D Architectural AI Rendering & Interior Walkthroughs', 'Transform 2D AutoCAD floor plans into photorealistic 3D interior renders and AI camera walkthroughs for a 3BHK penthouse project.', 'AI & Smart Automations', 'Tech', 22000, 'Arati Kulkarni · SpatialVibe Studio', 'SpatialVibe Studio', 'JP Nagar', 12.9063, 77.5857, ARRAY['AI & Smart Automations', '3D & Architectural AI Rendering', '3d ai rendering', 'architectural render', 'interior ai', 'walkthrough']),
('Custom Vibe Coding & Python Automation Scripts', 'Rapidly build lightweight web automation scripts and fix Next.js inventory API bugs using Claude Code and Copilot. Fast turnaround needed.', 'AI & Smart Automations', 'Tech', 12500, 'Karthik Menon · QuickCart Retail', 'QuickCart Retail', 'Bellandur', 12.9304, 77.6784, ARRAY['AI & Smart Automations', 'Custom Vibe Coding, Scripts & Web Fixes', 'vibe coding', 'claude code', 'copilot', 'custom script', 'rapid prototype'])
ON CONFLICT DO NOTHING;
