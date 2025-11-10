-- Fix: Restrict weekly_schedules SELECT access to authenticated users only
-- This prevents unauthenticated users from viewing member presence data

DROP POLICY IF EXISTS "Anyone can view schedules" ON public.weekly_schedules;

CREATE POLICY "Authenticated users can view schedules" 
ON public.weekly_schedules
FOR SELECT
USING (auth.uid() IS NOT NULL);