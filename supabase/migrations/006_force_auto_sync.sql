-- Migration 006: Force auto-sync on for all users
-- Auto-sync is no longer opt-in: every registered user is synced daily
-- by the cron job. The flag is kept in sync for consistency.

ALTER TABLE public.sync_metadata
  ALTER COLUMN auto_sync_enabled SET DEFAULT TRUE;

UPDATE public.sync_metadata
  SET auto_sync_enabled = TRUE
  WHERE auto_sync_enabled = FALSE;

-- Ensure every profile has a sync_metadata row (new signups never got one)
INSERT INTO public.sync_metadata (user_id, auto_sync_enabled)
SELECT id, TRUE
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
