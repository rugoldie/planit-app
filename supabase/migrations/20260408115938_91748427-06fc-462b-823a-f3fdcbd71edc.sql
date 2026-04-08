-- Fix 1: Restrict profiles SELECT to authenticated users only
DROP POLICY "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix 2: Restrict event_guests SELECT to authenticated users only
DROP POLICY "RSVPs are viewable by everyone" ON public.event_guests;
CREATE POLICY "RSVPs viewable by authenticated users"
  ON public.event_guests
  FOR SELECT
  TO authenticated
  USING (true);
