-- Create haven_settings table for storing admin settings like allowed IP
CREATE TABLE public.haven_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key text NOT NULL UNIQUE,
    setting_value text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on haven_settings
ALTER TABLE public.haven_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view all settings
CREATE POLICY "Admins can view all settings"
ON public.haven_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.haven_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update settings
CREATE POLICY "Admins can update settings"
ON public.haven_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create member_visits table for check-in records
CREATE TABLE public.member_visits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    checked_in_at timestamp with time zone NOT NULL DEFAULT now(),
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on member_visits
ALTER TABLE public.member_visits ENABLE ROW LEVEL SECURITY;

-- Admins can view all visits
CREATE POLICY "Admins can view all visits"
ON public.member_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own visits
CREATE POLICY "Users can view own visits"
ON public.member_visits
FOR SELECT
USING (auth.uid() = user_id);

-- Users cannot insert directly - only via edge function with service role

-- Create trigger to update updated_at on haven_settings
CREATE TRIGGER update_haven_settings_updated_at
BEFORE UPDATE ON public.haven_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default allowed_ip setting (empty by default)
INSERT INTO public.haven_settings (setting_key, setting_value)
VALUES ('allowed_ip', NULL)
ON CONFLICT (setting_key) DO NOTHING;