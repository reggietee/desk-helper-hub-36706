-- Create enum for livestream status
CREATE TYPE public.livestream_status AS ENUM ('draft', 'scheduled', 'live', 'ended');

-- Create livestreams table
CREATE TABLE public.livestreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMP WITH TIME ZONE,
  status livestream_status NOT NULL DEFAULT 'draft',
  restream_rtmp_url TEXT,
  restream_stream_key TEXT,
  player_embed_html TEXT,
  player_url TEXT,
  replace_haven_updates BOOLEAN NOT NULL DEFAULT false,
  replay_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage livestreams"
ON public.livestreams
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Members can view non-draft livestreams (but NOT stream key)
CREATE POLICY "Members can view active livestreams"
ON public.livestreams
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND status != 'draft'
  AND NOT has_role(auth.uid(), 'guest')
);

-- Create a secure view for members that excludes sensitive fields
CREATE OR REPLACE VIEW public.livestreams_public AS
SELECT 
  id,
  title,
  description,
  starts_at,
  status,
  player_embed_html,
  player_url,
  replace_haven_updates,
  replay_url,
  created_at,
  updated_at
FROM public.livestreams
WHERE status != 'draft';

-- Grant access to the view
GRANT SELECT ON public.livestreams_public TO authenticated;

-- Add trigger for updated_at
CREATE TRIGGER update_livestreams_updated_at
BEFORE UPDATE ON public.livestreams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();