-- Add email tracking column to ledger for idempotency
ALTER TABLE public.haven_credits_ledger 
ADD COLUMN email_sent_at TIMESTAMP WITH TIME ZONE;

-- Add user preference for credit notification emails
ALTER TABLE public.profiles 
ADD COLUMN credit_email_notifications BOOLEAN NOT NULL DEFAULT true;