
-- Intelligence entries table
CREATE TABLE public.intelligence_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  headline TEXT NOT NULL,
  editorial_category TEXT NOT NULL DEFAULT 'Market Signal',
  source TEXT NOT NULL,
  source_date TEXT,
  summary TEXT,
  why_it_matters TEXT,
  founder_takeaway TEXT,
  source_url TEXT,
  image_url TEXT,
  featured_quote TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.intelligence_entries ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read intelligence entries"
  ON public.intelligence_entries FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role insert (edge functions use service role)
CREATE POLICY "Service role can insert intelligence entries"
  ON public.intelligence_entries FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update intelligence entries"
  ON public.intelligence_entries FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insights posts table
CREATE TABLE public.insights_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  summary TEXT,
  body TEXT,
  tags TEXT[] DEFAULT '{}',
  author TEXT DEFAULT 'Phoenix Venture Studios',
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.insights_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read insights posts"
  ON public.insights_posts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage insights posts"
  ON public.insights_posts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Weekly brief runs table
CREATE TABLE public.weekly_brief_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  entry_count INTEGER DEFAULT 0,
  insights_post_id UUID REFERENCES public.insights_posts(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_brief_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read weekly brief runs"
  ON public.weekly_brief_runs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage weekly brief runs"
  ON public.weekly_brief_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
