-- Fix function security warnings by setting search_path

-- Update cleanup function with proper search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Update rate limit timestamp function with proper search_path
CREATE OR REPLACE FUNCTION public.update_rate_limit_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;