ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_contact_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_last_synced_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS provider_last_error text;

ALTER TABLE public.subscriber_profiles
  ADD COLUMN IF NOT EXISTS provider_last_synced_at timestamp with time zone;

ALTER TABLE public.weekly_brief_runs
  ADD COLUMN IF NOT EXISTS source_slugs text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS canonical_links text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hero_angle text,
  ADD COLUMN IF NOT EXISTS delivery_segment_key text DEFAULT 'phoenix-founder-signal-weekly',
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_campaign_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_last_synced_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS provider_payload jsonb;

CREATE TABLE IF NOT EXISTS public.newsletter_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_email text NOT NULL,
  provider text NOT NULL DEFAULT 'gohighlevel',
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read newsletter sync events" ON public.newsletter_sync_events;
DROP POLICY IF EXISTS "Service role can manage newsletter sync events" ON public.newsletter_sync_events;

CREATE POLICY "Anyone can read newsletter sync events"
  ON public.newsletter_sync_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage newsletter sync events"
  ON public.newsletter_sync_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
