CREATE TABLE public.image_health_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL DEFAULT 'founder-intelligence',
  total int NOT NULL DEFAULT 0,
  source_count int NOT NULL DEFAULT 0,
  generated_count int NOT NULL DEFAULT 0,
  openai_count int NOT NULL DEFAULT 0,
  lovable_count int NOT NULL DEFAULT 0,
  fallback_count int NOT NULL DEFAULT 0,
  default_fallback_count int NOT NULL DEFAULT 0,
  openai_errors int NOT NULL DEFAULT 0,
  gateway_402 int NOT NULL DEFAULT 0,
  details jsonb
);

CREATE INDEX idx_image_health_runs_run_at ON public.image_health_runs (run_at DESC);

ALTER TABLE public.image_health_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages image health runs"
  ON public.image_health_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);