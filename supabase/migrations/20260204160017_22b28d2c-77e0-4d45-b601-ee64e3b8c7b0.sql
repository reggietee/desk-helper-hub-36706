-- Create table for storing daily calls
CREATE TABLE public.daily_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_name TEXT NOT NULL DEFAULT 'Haven Call',
  note TEXT,
  daily_room_url TEXT NOT NULL,
  daily_room_name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  allow_guests BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.daily_calls ENABLE ROW LEVEL SECURITY;

-- Admins can manage all calls
CREATE POLICY "Admins can manage calls"
ON public.daily_calls
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Authenticated users can view active calls
CREATE POLICY "Authenticated users can view active calls"
ON public.daily_calls
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND status = 'active'
);

-- Add index for quick active call lookup
CREATE INDEX idx_daily_calls_status ON public.daily_calls(status);
CREATE INDEX idx_daily_calls_created_by ON public.daily_calls(created_by);