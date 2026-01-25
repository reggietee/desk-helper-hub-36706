-- Add email tracking columns to haven_credits_ledger for verification
ALTER TABLE public.haven_credits_ledger
ADD COLUMN IF NOT EXISTS email_message_id TEXT,
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS email_error TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.haven_credits_ledger.email_message_id IS 'Resend message ID for tracking delivery';
COMMENT ON COLUMN public.haven_credits_ledger.email_status IS 'Email status: pending, sent, failed, opted_out';
COMMENT ON COLUMN public.haven_credits_ledger.email_error IS 'Error message if email sending failed';