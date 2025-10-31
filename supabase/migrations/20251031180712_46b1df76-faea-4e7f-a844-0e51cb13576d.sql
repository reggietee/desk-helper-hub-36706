-- Create table for tracking OTP tokens
CREATE TABLE IF NOT EXISTS public.otp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  token TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0
);

-- Create index for faster lookups
CREATE INDEX idx_otp_tokens_email ON public.otp_tokens(user_email);
CREATE INDEX idx_otp_tokens_token ON public.otp_tokens(token);
CREATE INDEX idx_otp_tokens_expires ON public.otp_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.otp_tokens ENABLE ROW LEVEL SECURITY;

-- No direct access to OTP tokens
CREATE POLICY "No direct access to OTP tokens"
ON public.otp_tokens
FOR ALL
USING (false);

-- Create table for rate limiting
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ip_address, endpoint)
);

-- Create index for rate limit lookups
CREATE INDEX idx_rate_limits_ip_endpoint ON public.auth_rate_limits(ip_address, endpoint);

-- Enable RLS
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- No direct access to rate limits
CREATE POLICY "No direct access to rate limits"
ON public.auth_rate_limits
FOR ALL
USING (false);

-- Create table for login attempt logs
CREATE TABLE IF NOT EXISTS public.auth_attempt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for audit queries
CREATE INDEX idx_auth_logs_email ON public.auth_attempt_logs(user_email);
CREATE INDEX idx_auth_logs_created ON public.auth_attempt_logs(created_at);

-- Enable RLS
ALTER TABLE public.auth_attempt_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own auth logs
CREATE POLICY "Users can view own auth logs"
ON public.auth_attempt_logs
FOR SELECT
USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = user_email));

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.otp_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Function to update rate limit timestamp
CREATE OR REPLACE FUNCTION public.update_rate_limit_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for rate limit updates
CREATE TRIGGER update_rate_limits_updated_at
BEFORE UPDATE ON public.auth_rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_rate_limit_timestamp();