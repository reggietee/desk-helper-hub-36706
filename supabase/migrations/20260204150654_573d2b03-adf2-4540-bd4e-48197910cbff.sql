-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add hosting mode and meeting link columns to coworking_sprints
ALTER TABLE public.coworking_sprints 
ADD COLUMN IF NOT EXISTS hosting_mode text NOT NULL DEFAULT 'haven',
ADD COLUMN IF NOT EXISTS meeting_link text,
ADD COLUMN IF NOT EXISTS daily_room_url text,
ADD COLUMN IF NOT EXISTS daily_room_name text;

-- Add check constraint separately
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'coworking_sprints_hosting_mode_check'
  ) THEN
    ALTER TABLE public.coworking_sprints
    ADD CONSTRAINT coworking_sprints_hosting_mode_check
    CHECK (hosting_mode IN ('haven', 'google_meet', 'daily'));
  END IF;
END $$;

-- Create table for tracking sprint email reminders
CREATE TABLE IF NOT EXISTS public.coworking_sprint_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id uuid NOT NULL REFERENCES public.coworking_sprints(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email_type text NOT NULL,
  sent_at timestamp with time zone,
  resend_message_id text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (sprint_id, user_id, email_type)
);

-- Add check constraints
ALTER TABLE public.coworking_sprint_emails
DROP CONSTRAINT IF EXISTS coworking_sprint_emails_email_type_check;
ALTER TABLE public.coworking_sprint_emails
ADD CONSTRAINT coworking_sprint_emails_email_type_check
CHECK (email_type IN ('8am_reminder', '5min_link'));

ALTER TABLE public.coworking_sprint_emails
DROP CONSTRAINT IF EXISTS coworking_sprint_emails_status_check;
ALTER TABLE public.coworking_sprint_emails
ADD CONSTRAINT coworking_sprint_emails_status_check
CHECK (status IN ('pending', 'sent', 'failed'));

-- Enable RLS on the new table
ALTER TABLE public.coworking_sprint_emails ENABLE ROW LEVEL SECURITY;

-- Admin can view all sprint emails
DROP POLICY IF EXISTS "Admins can view sprint emails" ON public.coworking_sprint_emails;
CREATE POLICY "Admins can view sprint emails"
ON public.coworking_sprint_emails
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can manage sprint emails
DROP POLICY IF EXISTS "Admins can manage sprint emails" ON public.coworking_sprint_emails;
CREATE POLICY "Admins can manage sprint emails"
ON public.coworking_sprint_emails
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_coworking_sprint_emails_updated_at ON public.coworking_sprint_emails;
CREATE TRIGGER update_coworking_sprint_emails_updated_at
BEFORE UPDATE ON public.coworking_sprint_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();