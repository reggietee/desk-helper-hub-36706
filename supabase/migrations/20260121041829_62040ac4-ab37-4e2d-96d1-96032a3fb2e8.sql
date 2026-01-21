-- Create haven_credits table to track user credit balances
CREATE TABLE public.haven_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create haven_credits_ledger table to track all credit transactions
CREATE TABLE public.haven_credits_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.haven_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haven_credits_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies for haven_credits
CREATE POLICY "Users can view own credits"
  ON public.haven_credits
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS policies for haven_credits_ledger
CREATE POLICY "Users can view own credit history"
  ON public.haven_credits_ledger
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all credits
CREATE POLICY "Admins can view all credits"
  ON public.haven_credits
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all credit history"
  ON public.haven_credits_ledger
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_haven_credits_ledger_user_id ON public.haven_credits_ledger(user_id);
CREATE INDEX idx_haven_credits_ledger_created_at ON public.haven_credits_ledger(created_at DESC);