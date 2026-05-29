
-- Security logging table for blocked/suspicious form events
CREATE TABLE public.form_security_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_name text NOT NULL,
  email text,
  ip_address text,
  user_agent text,
  blocked_reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS - no public access, service_role only
ALTER TABLE public.form_security_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage security logs"
  ON public.form_security_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for rate limiting queries
CREATE INDEX idx_security_log_ip_form ON public.form_security_log (ip_address, form_name, created_at);
