DROP VIEW IF EXISTS public.public_intelligence_entries;

CREATE VIEW public.public_intelligence_entries AS
SELECT
  id, slug, headline, editorial_category, source, source_date, source_url,
  summary, why_it_matters, founder_takeaway, featured_quote,
  image_url, image_source_type, cta_text, cta_url, content_type, hook, created_at
FROM public.intelligence_entries;

GRANT SELECT ON public.public_intelligence_entries TO anon, authenticated;