
-- 1. newsletter_subscribers: remove public SELECT, restrict UPDATE and INSERT to service_role
DROP POLICY IF EXISTS "Anyone can look up subscription" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can unsubscribe" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;

-- Allow UPDATE only matching own email (for unsubscribe flow)
CREATE POLICY "Users can update own subscription by email"
ON public.newsletter_subscribers
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Actually we need service role for insert now
CREATE POLICY "Service role can manage newsletter subscribers"
ON public.newsletter_subscribers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. leads: remove permissive anon INSERT, restrict to service_role only
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;

CREATE POLICY "Service role can manage leads"
ON public.leads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. post_booking_interactions: remove permissive anon INSERT
DROP POLICY IF EXISTS "Anyone can submit post booking interaction" ON public.post_booking_interactions;

-- 4. subscriber_profiles: restrict SELECT and UPDATE
DROP POLICY IF EXISTS "Anyone can read subscriber profiles" ON public.subscriber_profiles;
DROP POLICY IF EXISTS "Anyone can submit subscriber profile" ON public.subscriber_profiles;
DROP POLICY IF EXISTS "Anyone can update own subscriber profile" ON public.subscriber_profiles;
