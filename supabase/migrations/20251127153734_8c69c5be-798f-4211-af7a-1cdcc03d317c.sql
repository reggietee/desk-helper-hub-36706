-- Create table to track calendar events for updates/cancellations
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  schedule_date DATE NOT NULL,
  event_uid TEXT NOT NULL,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  time_windows TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, schedule_date)
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own calendar events
CREATE POLICY "Users can view own calendar events"
ON public.calendar_events
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own calendar events
CREATE POLICY "Users can insert own calendar events"
ON public.calendar_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own calendar events
CREATE POLICY "Users can update own calendar events"
ON public.calendar_events
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own calendar events
CREATE POLICY "Users can delete own calendar events"
ON public.calendar_events
FOR DELETE
USING (auth.uid() = user_id);