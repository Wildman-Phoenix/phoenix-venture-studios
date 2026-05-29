-- Add new columns for expanded capital readiness form
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS founder_role text,
ADD COLUMN IF NOT EXISTS credit_strength text,
ADD COLUMN IF NOT EXISTS prior_funding text;