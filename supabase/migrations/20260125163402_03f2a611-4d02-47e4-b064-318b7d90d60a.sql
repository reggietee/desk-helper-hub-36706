-- Create table to track daily report runs for idempotency
CREATE TABLE public.daily_credits_report_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  members_included INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_credits_report_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view report logs
CREATE POLICY "Admins can view report logs"
  ON public.daily_credits_report_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for date lookups
CREATE INDEX idx_daily_credits_report_logs_date ON public.daily_credits_report_logs(report_date);

-- Add updated_at trigger
CREATE TRIGGER update_daily_credits_report_logs_updated_at
  BEFORE UPDATE ON public.daily_credits_report_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();