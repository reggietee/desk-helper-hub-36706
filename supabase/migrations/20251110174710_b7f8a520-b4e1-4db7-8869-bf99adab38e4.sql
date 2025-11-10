-- Create weekly_schedules table
CREATE TABLE public.weekly_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  show_name BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date, day_of_week)
);

-- Enable RLS
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;

-- Users can view all schedules (to see occupancy)
CREATE POLICY "Anyone can view schedules"
ON public.weekly_schedules
FOR SELECT
USING (true);

-- Users can insert their own schedules
CREATE POLICY "Users can insert own schedules"
ON public.weekly_schedules
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own schedules
CREATE POLICY "Users can update own schedules"
ON public.weekly_schedules
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own schedules
CREATE POLICY "Users can delete own schedules"
ON public.weekly_schedules
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_weekly_schedules_week ON public.weekly_schedules(week_start_date, day_of_week);
CREATE INDEX idx_weekly_schedules_user ON public.weekly_schedules(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_weekly_schedules_updated_at
BEFORE UPDATE ON public.weekly_schedules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();