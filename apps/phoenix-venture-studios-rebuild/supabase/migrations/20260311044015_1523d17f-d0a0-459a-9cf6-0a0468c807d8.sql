CREATE TABLE public.post_booking_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  lead_email text,
  lead_id uuid,
  priority text,
  business_stage text,
  conversation_type text
);

ALTER TABLE public.post_booking_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit post booking interaction"
ON public.post_booking_interactions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Service role can manage post booking interactions"
ON public.post_booking_interactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);