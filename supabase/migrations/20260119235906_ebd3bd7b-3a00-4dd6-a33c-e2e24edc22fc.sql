-- Create table to track calendar invite send status
CREATE TABLE public.calendar_invite_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  schedule_date DATE NOT NULL,
  week_start_date DATE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  time_windows TEXT[] NOT NULL,
  event_uid TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'cancel')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient lookups
CREATE INDEX idx_calendar_invite_logs_user_date ON public.calendar_invite_logs(user_id, schedule_date);
CREATE INDEX idx_calendar_invite_logs_status ON public.calendar_invite_logs(status);
CREATE INDEX idx_calendar_invite_logs_week ON public.calendar_invite_logs(week_start_date);

-- Enable RLS
ALTER TABLE public.calendar_invite_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own invite logs
CREATE POLICY "Users can view own invite logs"
ON public.calendar_invite_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all invite logs
CREATE POLICY "Admins can view all invite logs"
ON public.calendar_invite_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update invite logs (for resend functionality)
CREATE POLICY "Admins can update invite logs"
ON public.calendar_invite_logs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role will insert via edge function (no policy needed for service role)

-- Add trigger for updated_at
CREATE TRIGGER update_calendar_invite_logs_updated_at
BEFORE UPDATE ON public.calendar_invite_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();