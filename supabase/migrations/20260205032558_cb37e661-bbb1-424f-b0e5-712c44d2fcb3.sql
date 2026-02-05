-- Drop the problematic INSERT policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can join sprints" ON coworking_sprint_participants;

-- Create a simple INSERT policy that just checks user can only insert their own record
-- Capacity enforcement will be handled by the application layer before insert
CREATE POLICY "Users can join sprints"
ON coworking_sprint_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);