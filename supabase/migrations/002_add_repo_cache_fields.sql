-- Migration 002: Add caching fields to repositories table
-- Adds pr_count, last_synced_at, and description so the settings page
-- can display repo metadata from cache without hitting the GitHub API.

-- Add description column to repositories
ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS pr_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Add is_approved flag to pull_requests for filtering
-- (already filtered at sync time, but useful for future queries)
ALTER TABLE public.pull_requests
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT true;

-- Index for fast per-repo PR count queries
CREATE INDEX IF NOT EXISTS idx_pull_requests_user_repo ON public.pull_requests(user_id, repo_full_name);
