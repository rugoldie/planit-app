ALTER TABLE public.event_guests DROP CONSTRAINT IF EXISTS event_guests_event_id_fkey;
ALTER TABLE public.event_guests ADD CONSTRAINT event_guests_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_event_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_event_id_fkey;
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.polls DROP CONSTRAINT IF EXISTS polls_event_id_fkey;
ALTER TABLE public.polls ADD CONSTRAINT polls_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.event_photos DROP CONSTRAINT IF EXISTS event_photos_event_id_fkey;
ALTER TABLE public.event_photos ADD CONSTRAINT event_photos_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE NOT VALID;