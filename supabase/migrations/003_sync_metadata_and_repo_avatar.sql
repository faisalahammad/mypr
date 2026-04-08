-- Migration 003: Add sync_metadata table and repo owner avatar
-- 1. New table: sync_metadata (stores last successful date range per user)
-- 2. New column: repositories.owner_avatar_url (cached GitHub owner avatar)

-- Sync metadata table — one row per user
CREATE TABLE IF NOT EXISTS public.sync_metadata (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_date_range TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owner avatar URL on repositories (cached from GitHub during sync)
ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS owner_avatar_url TEXT;

-- RLS for sync_metadata
ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync metadata" ON public.sync_metadata
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync metadata" ON public.sync_metadata
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync metadata" ON public.sync_metadata
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.sync_metadata TO authenticated;
