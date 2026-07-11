-- Make the public intelligence view honor the querying role's permissions and RLS.
ALTER VIEW public.public_intelligence_entries SET (security_invoker = true);

-- This event-trigger helper is maintenance-only and must not be callable over RPC.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- Cover the foreign keys used by subscriber and weekly-brief maintenance paths.
CREATE INDEX IF NOT EXISTS subscriber_profiles_subscriber_id_idx
  ON public.subscriber_profiles (subscriber_id);

CREATE INDEX IF NOT EXISTS weekly_brief_runs_insights_post_id_idx
  ON public.weekly_brief_runs (insights_post_id);
