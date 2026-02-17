
-- Add unique constraint to prevent duplicate onboarding bonus awards
-- Using a partial unique index so it only applies to onboarding_bonus entries
CREATE UNIQUE INDEX idx_unique_onboarding_bonus_per_user 
ON public.haven_credits_ledger (user_id, reason) 
WHERE reason = 'onboarding_bonus';
