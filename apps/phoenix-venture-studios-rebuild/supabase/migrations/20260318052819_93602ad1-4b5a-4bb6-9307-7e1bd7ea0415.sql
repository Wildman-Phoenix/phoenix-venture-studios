CREATE TABLE public.subscriber_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  what_are_you_building text,
  current_stage text,
  primary_interest text,
  biggest_challenge text,
  interests text[] DEFAULT '{}'::text[],
  interactive_newsletter_preference boolean DEFAULT false,
  feedback text,
  onboarding_email_2_sent boolean DEFAULT false,
  onboarding_email_3_sent boolean DEFAULT false,
  onboarding_email_2_sent_at timestamptz,
  onboarding_email_3_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.subscriber_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can insert their profile (from the preferences form)
CREATE POLICY "Anyone can submit subscriber profile"
ON public.subscriber_profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Anyone can update their own profile by email match
CREATE POLICY "Anyone can update own subscriber profile"
ON public.subscriber_profiles
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Service role full access
CREATE POLICY "Service role can manage subscriber profiles"
ON public.subscriber_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anyone can read their own profile
CREATE POLICY "Anyone can read subscriber profiles"
ON public.subscriber_profiles
FOR SELECT
TO anon, authenticated
USING (true);