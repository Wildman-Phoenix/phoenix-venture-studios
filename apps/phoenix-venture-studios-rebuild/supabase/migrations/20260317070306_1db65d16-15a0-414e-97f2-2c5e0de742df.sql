
ALTER TABLE public.weekly_brief_runs
  ADD COLUMN IF NOT EXISTS subject_line text,
  ADD COLUMN IF NOT EXISTS preview_text text,
  ADD COLUMN IF NOT EXISTS html_body text,
  ADD COLUMN IF NOT EXISTS text_body text,
  ADD COLUMN IF NOT EXISTS source_entry_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS recipient_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text;
