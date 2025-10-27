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