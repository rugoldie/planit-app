-- Drop the current permissive policy
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

-- Allow authenticated users to potentially access rows
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- Restrict so only the owner can actually read their own row
CREATE POLICY "Users can only view their own profile"
  ON public.profiles
  AS RESTRICTIVE FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a safe public view for guest list lookups (name + avatar only)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT user_id, name, avatar_url
  FROM public.profiles;
