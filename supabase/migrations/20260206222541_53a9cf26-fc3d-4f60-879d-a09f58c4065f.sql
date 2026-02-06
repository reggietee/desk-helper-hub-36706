-- Drop the security definer view and use a function with proper security instead
DROP VIEW IF EXISTS public.livestreams_public;

-- Create a security definer function to get public livestream data (excluding sensitive fields)
CREATE OR REPLACE FUNCTION public.get_public_livestreams()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  starts_at TIMESTAMP WITH TIME ZONE,
  status livestream_status,
  player_embed_html TEXT,
  player_url TEXT,
  replace_haven_updates BOOLEAN,
  replay_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    l.id,
    l.title,
    l.description,
    l.starts_at,
    l.status,
    l.player_embed_html,
    l.player_url,
    l.replace_haven_updates,
    l.replay_url,
    l.created_at,
    l.updated_at
  FROM public.livestreams l
  WHERE l.status != 'draft'
    AND auth.uid() IS NOT NULL
    AND NOT has_role(auth.uid(), 'guest')
$$;

-- Create a function specifically for active/scheduled livestreams (for dashboard)
CREATE OR REPLACE FUNCTION public.get_active_livestream()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  starts_at TIMESTAMP WITH TIME ZONE,
  status livestream_status,
  player_embed_html TEXT,
  player_url TEXT,
  replace_haven_updates BOOLEAN,
  replay_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    l.id,
    l.title,
    l.description,
    l.starts_at,
    l.status,
    l.player_embed_html,
    l.player_url,
    l.replace_haven_updates,
    l.replay_url
  FROM public.livestreams l
  WHERE l.status IN ('scheduled', 'live')
    AND auth.uid() IS NOT NULL
    AND NOT has_role(auth.uid(), 'guest')
  ORDER BY 
    CASE l.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 END,
    l.starts_at ASC
  LIMIT 1
$$;