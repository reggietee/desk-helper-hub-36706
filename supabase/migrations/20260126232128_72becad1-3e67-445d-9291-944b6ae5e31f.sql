-- Create feed_items table for chat messages and activity posts
CREATE TABLE public.feed_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('chat', 'activity')),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  credits_amount INTEGER,
  action_name TEXT,
  ledger_id UUID UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient pagination queries
CREATE INDEX idx_feed_items_created_at ON public.feed_items(created_at DESC);
CREATE INDEX idx_feed_items_ledger_id ON public.feed_items(ledger_id) WHERE ledger_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- All authenticated users can view feed items
CREATE POLICY "Authenticated users can view feed items" 
ON public.feed_items 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Users can insert their own chat messages
CREATE POLICY "Users can insert own chat messages" 
ON public.feed_items 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND type = 'chat' 
  AND author_id = auth.uid()
);

-- Activity posts are inserted via service role (edge functions)
-- No direct user insert for activity type

-- Users can delete their own chat messages
CREATE POLICY "Users can delete own chat messages" 
ON public.feed_items 
FOR DELETE 
USING (
  auth.uid() = author_id 
  AND type = 'chat'
);

-- Enable realtime for feed_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_items;