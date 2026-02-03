-- ===========================================
-- FIX: Replace security_invoker view with SECURITY DEFINER function
-- The view with security_invoker can't see other profiles due to RLS
-- ===========================================

-- Drop the view that doesn't work with restrictive RLS
DROP VIEW IF EXISTS public.member_directory;

-- Create a SECURITY DEFINER function that safely returns approved member info
-- This bypasses RLS to return only id and full_name for approved members
CREATE OR REPLACE FUNCTION public.get_member_directory()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.status = 'approved'
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_member_directory() TO authenticated;