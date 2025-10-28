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