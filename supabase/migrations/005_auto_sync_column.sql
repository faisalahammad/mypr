-- Migration 005: Add auto_sync_enabled to sync_metadata
-- Allows users to opt-in to hourly automatic PR/repo syncing.

ALTER TABLE public.sync_metadata
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT FALSE;
