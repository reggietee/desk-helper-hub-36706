-- Add 'guest' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'guest';

-- Add allow_guests column to coworking_sprints table
ALTER TABLE public.coworking_sprints 
ADD COLUMN IF NOT EXISTS allow_guests boolean NOT NULL DEFAULT false;

-- Ensure all approved users without a role get 'member' role
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'member'::app_role
FROM public.profiles p
WHERE p.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
  );

-- Add RLS policy for admins to manage roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));