
-- Migration: 20251026173541
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create product_signouts table
CREATE TABLE public.product_signouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('TV', 'Whiteboard', 'Book from library')),
  checkout_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.product_signouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signouts"
  ON public.product_signouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own signouts"
  ON public.product_signouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create call_room_bookings table
CREATE TABLE public.call_room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  booking_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.call_room_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own call room bookings"
  ON public.call_room_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own call room bookings"
  ON public.call_room_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create meeting_room_bookings table
CREATE TABLE public.meeting_room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  booking_time TIMESTAMPTZ NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meeting_room_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meeting room bookings"
  ON public.meeting_room_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meeting room bookings"
  ON public.meeting_room_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create private_office_bookings table
CREATE TABLE public.private_office_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  booking_date DATE NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.private_office_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private office bookings"
  ON public.private_office_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own private office bookings"
  ON public.private_office_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create issues table
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('Request cleanup', 'Issue with member', 'Refill snacks', 'Issue with coffee machine', 'Other')),
  details TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own issues"
  ON public.issues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own issues"
  ON public.issues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Migration: 20251027153907
-- Create table for guest day pass requests
CREATE TABLE public.guest_day_pass_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  arrival_date DATE NOT NULL,
  arrival_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.guest_day_pass_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can create own guest day pass requests" 
ON public.guest_day_pass_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own guest day pass requests" 
ON public.guest_day_pass_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Migration: 20251028031222
-- Add status tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN declined_at timestamp with time zone,
ADD COLUMN declined_reason text;

-- Create approval events audit log
CREATE TABLE public.approval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN ('approved', 'declined')),
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  token_used text,
  ip_address text,
  user_agent text
);

ALTER TABLE public.approval_events ENABLE ROW LEVEL SECURITY;

-- Create password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Index for faster token lookups
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

-- RLS policies for approval_events (admin only in future, for now no access)
CREATE POLICY "No direct access to approval events"
ON public.approval_events
FOR ALL
USING (false);

-- RLS policies for password_reset_tokens (no direct access)
CREATE POLICY "No direct access to reset tokens"
ON public.password_reset_tokens
FOR ALL
USING (false);

-- Migration: 20251031180711
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

-- Migration: 20251031180739
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
