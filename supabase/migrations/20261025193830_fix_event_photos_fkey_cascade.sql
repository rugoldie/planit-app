-- event_photos.event_id was originally created (20260409140417) with no
-- foreign key at all. If a foreign key was since added by hand (e.g. via a
-- dashboard table editor) without specifying ON DELETE CASCADE - the
-- editor's default - deleting an event with any gallery photos fails
-- outright with a foreign key violation. Drop whatever constraint exists
-- under this name and recreate it with the correct cascade.
ALTER TABLE public.event_photos DROP CONSTRAINT IF EXISTS event_photos_event_id_fkey;
ALTER TABLE public.event_photos ADD CONSTRAINT event_photos_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
