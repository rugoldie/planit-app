-- Friend requests were never instant: `friendships` and `notifications`
-- were missing from the realtime publication entirely, so client-side
-- postgres_changes subscriptions on them silently receive nothing.
-- REPLICA IDENTITY FULL is required because the app filters these
-- subscriptions on non-primary-key columns (requester_id/recipient_id,
-- user_id) — the default replica identity only ships primary-key columns
-- on UPDATE/DELETE, so a filtered subscription would miss those events.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'friendships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

ALTER TABLE public.friendships REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Event hosts invite friends by inserting event_guests rows on the
-- friend's behalf (rsvp_status = 'invited'), approve/decline waitlisted
-- guests (insert/update another user's row), and remove guests (delete
-- another user's row) from the guest-list drawer. The only existing
-- policies require auth.uid() = user_id, so all three host actions were
-- silently rejected by RLS. Add additive host policies (permissive
-- policies are OR'd) scoped to the host's own event.
CREATE POLICY "Hosts can invite guests" ON public.event_guests
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
  );

CREATE POLICY "Hosts can update guest RSVPs" ON public.event_guests
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
  );

CREATE POLICY "Hosts can remove guests" ON public.event_guests
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
  );
