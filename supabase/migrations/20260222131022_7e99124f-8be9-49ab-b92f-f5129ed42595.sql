
-- Waitlist signups table
CREATE TABLE public.waitlist_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  wallet TEXT,
  confirmation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique email constraint
CREATE UNIQUE INDEX idx_waitlist_email ON public.waitlist_signups (email);

-- Index on confirmation token for lookup
CREATE INDEX idx_waitlist_token ON public.waitlist_signups (confirmation_token);

-- Enable RLS
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (signup) via edge function using service role
-- No public read access needed
CREATE POLICY "Allow service role full access"
ON public.waitlist_signups
FOR ALL
USING (true)
WITH CHECK (true);

-- Actually, since we'll use edge functions with service role key,
-- we should restrict public access completely
-- The policy above is for service role which bypasses RLS anyway
-- So let's make it restrictive for anon users
DROP POLICY "Allow service role full access" ON public.waitlist_signups;

-- No public access at all - only service role (edge functions) can access
CREATE POLICY "No public access"
ON public.waitlist_signups
FOR SELECT
USING (false);
