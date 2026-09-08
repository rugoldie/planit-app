-- Expose username on profiles_public so friend search can match on it
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
  SELECT user_id, name, username, avatar_url
  FROM public.profiles;
