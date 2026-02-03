-- ===========================================
-- FIX #1 & #3: Secure the profiles table
-- ===========================================

-- Drop the overly permissive policy that exposes all profile data
DROP POLICY IF EXISTS "Authenticated users can view all profile names" ON public.profiles;

-- Create a secure view for member directory (only shows approved members with limited fields)
CREATE OR REPLACE VIEW public.member_directory
WITH (security_invoker = on) AS
SELECT id, full_name
FROM public.profiles
WHERE status = 'approved';

-- Grant access to authenticated users
GRANT SELECT ON public.member_directory TO authenticated;

-- ===========================================
-- FIX #2: Secure the weekly_schedules table
-- ===========================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view schedules" ON public.weekly_schedules;

-- Create new policy: Users can view their own schedules
CREATE POLICY "Users can view own schedules"
ON public.weekly_schedules
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create new policy: Users can view schedules where show_name is true (public schedules)
CREATE POLICY "Users can view public schedules"
ON public.weekly_schedules
FOR SELECT
TO authenticated
USING (show_name = true);

-- Create new policy: Admins can view all schedules
CREATE POLICY "Admins can view all schedules"
ON public.weekly_schedules
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));