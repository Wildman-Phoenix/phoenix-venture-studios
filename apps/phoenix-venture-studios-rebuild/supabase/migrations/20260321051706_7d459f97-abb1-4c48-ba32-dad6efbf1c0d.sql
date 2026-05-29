
-- Add image pipeline metadata columns to intelligence_entries
ALTER TABLE public.intelligence_entries
  ADD COLUMN IF NOT EXISTS image_source_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS image_relevance_score numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS image_prompt_used text DEFAULT NULL;

-- Add index for anti-repetition queries on recent scene IDs
CREATE INDEX IF NOT EXISTS idx_intelligence_entries_scene_id_created
  ON public.intelligence_entries (created_at DESC)
  WHERE image_scene_id IS NOT NULL;
