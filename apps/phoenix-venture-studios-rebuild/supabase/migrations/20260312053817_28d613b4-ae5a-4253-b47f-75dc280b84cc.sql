
-- Add marketing consent to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;

-- Add marketing consent and unsubscribed status to newsletter_subscribers
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT true;
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribed boolean DEFAULT false;
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at timestamp with time zone;

-- Allow anon to update newsletter_subscribers for unsubscribe
CREATE POLICY "Anyone can unsubscribe" ON public.newsletter_subscribers
FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Allow anon to select newsletter_subscribers for unsubscribe lookup
CREATE POLICY "Anyone can look up subscription" ON public.newsletter_subscribers
FOR SELECT TO anon, authenticated
USING (true);
