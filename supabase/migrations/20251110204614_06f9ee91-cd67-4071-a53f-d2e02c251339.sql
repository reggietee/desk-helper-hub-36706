-- Allow authenticated users to view all profile names
-- This enables the weekly presence feature where members can see each other's names
-- when they opt-in to show their schedules
CREATE POLICY "Authenticated users can view all profile names"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);