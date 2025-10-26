-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create product_signouts table
CREATE TABLE public.product_signouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('TV', 'Whiteboard', 'Book from library')),
  checkout_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.product_signouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signouts"
  ON public.product_signouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own signouts"
  ON public.product_signouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create call_room_bookings table
CREATE TABLE public.call_room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  booking_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.call_room_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own call room bookings"
  ON public.call_room_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own call room bookings"
  ON public.call_room_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create meeting_room_bookings table
CREATE TABLE public.meeting_room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  booking_time TIMESTAMPTZ NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meeting_room_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meeting room bookings"
  ON public.meeting_room_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meeting room bookings"
  ON public.meeting_room_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create private_office_bookings table
CREATE TABLE public.private_office_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  booking_date DATE NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.private_office_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private office bookings"
  ON public.private_office_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own private office bookings"
  ON public.private_office_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create issues table
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('Request cleanup', 'Issue with member', 'Refill snacks', 'Issue with coffee machine', 'Other')),
  details TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own issues"
  ON public.issues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own issues"
  ON public.issues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();