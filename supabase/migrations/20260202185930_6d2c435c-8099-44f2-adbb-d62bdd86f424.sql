-- Add admin_notified_at column to profiles for tracking notification idempotency
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_notified_at timestamp with time zone DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.admin_notified_at IS 'Timestamp when admin was notified about this pending user signup';