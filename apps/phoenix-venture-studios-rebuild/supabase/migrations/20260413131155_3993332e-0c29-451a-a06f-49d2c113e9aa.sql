
-- Create a restricted view with only public-safe columns
CREATE OR REPLACE VIEW public.public_intelligence_entries AS
SELECT
  id,
  slug,
  headline,
  editorial_category,
  source,
  source_date,
  source_url,
  summary,
  why_it_matters,
  founder_takeaway,
  featured_quote,
  image_url,
  image_source_type,
  cta_text,
  cta_url,
  content_type,
  created_at
FROM public.intelligence_entries;

-- Drop the public SELECT policy on the raw table
DROP POLICY IF EXISTS "Anyone can read intelligence entries" ON public.intelligence_entries;

-- Grant SELECT on the view to anon and authenticated
GRANT SELECT ON public.public_intelligence_entries TO anon, authenticated;
