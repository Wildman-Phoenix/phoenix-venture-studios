ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'new';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nurture_stage text DEFAULT 'initial_submission';