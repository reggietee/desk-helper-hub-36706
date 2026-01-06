-- Create haven_updates table for admin-controlled announcements
CREATE TABLE public.haven_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  learn_more_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.haven_updates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active updates
CREATE POLICY "Authenticated users can view active updates"
ON public.haven_updates
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Admins can view all updates
CREATE POLICY "Admins can view all updates"
ON public.haven_updates
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert updates
CREATE POLICY "Admins can insert updates"
ON public.haven_updates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update updates
CREATE POLICY "Admins can update updates"
ON public.haven_updates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete updates
CREATE POLICY "Admins can delete updates"
ON public.haven_updates
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_haven_updates_updated_at
BEFORE UPDATE ON public.haven_updates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for update images
INSERT INTO storage.buckets (id, name, public) VALUES ('haven-updates', 'haven-updates', true);

-- Storage policies for update images
CREATE POLICY "Anyone can view update images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'haven-updates');

CREATE POLICY "Admins can upload update images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'haven-updates' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update update images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'haven-updates' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete update images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'haven-updates' AND has_role(auth.uid(), 'admin'::app_role));