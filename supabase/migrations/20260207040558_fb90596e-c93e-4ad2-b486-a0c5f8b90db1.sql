-- Add allow_guests column to livestreams table (may already exist from partial migration)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'livestreams' AND column_name = 'allow_guests') 
  THEN
    ALTER TABLE public.livestreams ADD COLUMN allow_guests boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Drop existing functions to allow changing return type
DROP FUNCTION IF EXISTS public.get_active_livestream();
DROP FUNCTION IF EXISTS public.get_public_livestreams();

-- Recreate get_active_livestream function with allow_guests field
CREATE OR REPLACE FUNCTION public.get_active_livestream()
 RETURNS TABLE(id uuid, title text, description text, starts_at timestamp with time zone, status livestream_status, player_embed_html text, player_url text, replace_haven_updates boolean, replay_url text, allow_guests boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    l.allow_guests
  FROM public.livestreams l
  WHERE l.status IN ('scheduled', 'live')
    AND auth.uid() IS NOT NULL
    AND NOT has_role(auth.uid(), 'guest')
  ORDER BY 
    CASE l.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 END,
    l.starts_at ASC
  LIMIT 1
$function$;

-- Create a separate function for guests that respects allow_guests flag
CREATE OR REPLACE FUNCTION public.get_active_livestream_for_guests()
 RETURNS TABLE(id uuid, title text, description text, starts_at timestamp with time zone, status livestream_status, player_embed_html text, player_url text, replace_haven_updates boolean, replay_url text, allow_guests boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    l.allow_guests
  FROM public.livestreams l
  WHERE l.status IN ('scheduled', 'live')
    AND auth.uid() IS NOT NULL
    AND l.allow_guests = true
  ORDER BY 
    CASE l.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 END,
    l.starts_at ASC
  LIMIT 1
$function$;

-- Recreate get_public_livestreams with allow_guests
CREATE OR REPLACE FUNCTION public.get_public_livestreams()
 RETURNS TABLE(id uuid, title text, description text, starts_at timestamp with time zone, status livestream_status, player_embed_html text, player_url text, replace_haven_updates boolean, replay_url text, allow_guests boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    l.allow_guests,
    l.created_at,
    l.updated_at
  FROM public.livestreams l
  WHERE l.status != 'draft'
    AND auth.uid() IS NOT NULL
    AND NOT has_role(auth.uid(), 'guest')
$function$;