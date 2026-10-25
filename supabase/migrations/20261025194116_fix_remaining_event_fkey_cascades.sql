-- Confirmed by a live delete attempt: "polls_event_id_fkey" currently has
-- no ON DELETE CASCADE, despite the original migration (20260611000000)
-- specifying one - the live database has drifted from the committed
-- migration history (most likely a dashboard edit at some point re-added
-- these constraints without the cascade). event_photos was already fixed
-- in 20261025193830; the three other tables from the original 20260408104921
-- migration (event_guests, comments, direct_messages) were defined with the
-- same cascade and are the next most likely to have the same drift, so fix
-- all four confirmed/suspected tables here rather than wait for each one to
-- surface its own delete failure one at a time.

ALTER TABLE public.event_guests DROP CONSTRAINT IF EXISTS event_guests_event_id_fkey;
ALTER TABLE public.event_guests ADD CONSTRAINT event_guests_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_event_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_event_id_fkey;
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.polls DROP CONSTRAINT IF EXISTS polls_event_id_fkey;
ALTER TABLE public.polls ADD CONSTRAINT polls_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
