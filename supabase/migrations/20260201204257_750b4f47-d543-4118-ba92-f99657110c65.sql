-- Create coworking_sprints table (single active sprint at a time)
CREATE TABLE public.coworking_sprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Co-Working Sprint',
  description TEXT,
  sprint_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coworking_sprint_participants table
CREATE TABLE public.coworking_sprint_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.coworking_sprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(sprint_id, user_id)
);

-- Enable RLS on both tables
ALTER TABLE public.coworking_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coworking_sprint_participants ENABLE ROW LEVEL SECURITY;

-- Sprints: Admins can do everything
CREATE POLICY "Admins can manage sprints"
  ON public.coworking_sprints
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Sprints: Authenticated users can view active sprints
CREATE POLICY "Authenticated users can view active sprints"
  ON public.coworking_sprints
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Participants: Admins can view all participants
CREATE POLICY "Admins can view all participants"
  ON public.coworking_sprint_participants
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Participants: Users can view participants of active sprints
CREATE POLICY "Users can view sprint participants"
  ON public.coworking_sprint_participants
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.coworking_sprints
      WHERE id = sprint_id AND is_active = true
    )
  );

-- Participants: Users can join sprints (insert own record)
CREATE POLICY "Users can join sprints"
  ON public.coworking_sprint_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.coworking_sprints s
      WHERE s.id = sprint_id 
        AND s.is_active = true
        AND (SELECT COUNT(*) FROM public.coworking_sprint_participants p WHERE p.sprint_id = s.id) < s.max_participants
    )
  );

-- Participants: Users can leave sprints (delete own record)
CREATE POLICY "Users can leave sprints"
  ON public.coworking_sprint_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- Participants: Admins can delete any participant
CREATE POLICY "Admins can remove participants"
  ON public.coworking_sprint_participants
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger for sprints
CREATE TRIGGER update_coworking_sprints_updated_at
  BEFORE UPDATE ON public.coworking_sprints
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for participants table (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.coworking_sprint_participants;