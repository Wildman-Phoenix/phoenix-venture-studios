
-- Add Phoenix Editorial content fields to intelligence_entries
ALTER TABLE public.intelligence_entries
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS hook text,
  ADD COLUMN IF NOT EXISTS post_angle text,
  ADD COLUMN IF NOT EXISTS short_social_post text,
  ADD COLUMN IF NOT EXISTS long_social_post text,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS hashtags text[],
  ADD COLUMN IF NOT EXISTS image_direction text;

-- Index for filtering editorial content by source and content_type
CREATE INDEX IF NOT EXISTS idx_intelligence_entries_source ON public.intelligence_entries (source);
CREATE INDEX IF NOT EXISTS idx_intelligence_entries_content_type ON public.intelligence_entries (content_type);
