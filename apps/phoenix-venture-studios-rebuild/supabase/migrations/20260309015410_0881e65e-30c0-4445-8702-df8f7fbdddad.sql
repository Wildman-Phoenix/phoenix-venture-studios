CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  state TEXT,
  industry TEXT,
  funding_amount TEXT,
  business_stage TEXT,
  use_of_funds TEXT,
  venture_summary TEXT,
  budget_range TEXT,
  timeline_to_launch TEXT,
  support_interest TEXT,
  submission_type TEXT NOT NULL DEFAULT 'contact',
  preferred_follow_up TEXT,
  has_entity BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);