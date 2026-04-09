-- Add preferences JSONB column to trips table if it doesn't already exist
-- Applied: 2026-04-09

ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::JSONB;
