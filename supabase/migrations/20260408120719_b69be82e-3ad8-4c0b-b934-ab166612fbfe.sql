-- Recreate view WITHOUT security_invoker so it can read all profiles
-- This is safe because the view only exposes non-sensitive fields
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
  SELECT user_id, name, avatar_url
  FROM public.profiles;
