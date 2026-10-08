-- Local proposal only. Deploy with newsletter-welcome after approved DB migration.
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS welcome_email_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_email_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_email_id text;

ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS welcome_email_attempt_provider text;
