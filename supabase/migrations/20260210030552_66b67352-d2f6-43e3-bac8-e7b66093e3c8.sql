
-- Create onboarding progress table to track member onboarding steps
CREATE TABLE public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  profile_completed_at timestamptz,
  week_planned_at timestamptz,
  checked_in_at timestamptz,
  feed_posted_at timestamptz,
  sprint_joined_at timestamptz,
  bonus_awarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own onboarding progress
CREATE POLICY "Users can view own onboarding progress"
ON public.onboarding_progress
FOR SELECT
USING (auth.uid() = user_id);

-- No direct client insert/update/delete - managed by edge function
CREATE POLICY "No direct client modifications"
ON public.onboarding_progress
FOR ALL
USING (false)
WITH CHECK (false);

-- Admins can view all onboarding progress
CREATE POLICY "Admins can view all onboarding progress"
ON public.onboarding_progress
FOR SELECT
USING (has_role(auth.uid(), 'admin'));
