-- Fixes the 4 critical findings from a security scan: notifications, polls,
-- poll_votes, and friendships allowed any user to read/change/delete all
-- records. Confirmed by reading the actual migration history (not guessed):
--
-- 1. polls/poll_votes (20260611000000) were created with no
--    ENABLE ROW LEVEL SECURITY at all - wide open by default.
-- 2. notifications' INSERT policy (20260606000000) is `WITH CHECK (true)` -
--    any user can insert a notification into anyone's inbox with arbitrary
--    content. Traced every real call site (createNotification, used from
--    EventView/GuestEventView/Friends/UserProfile) - they're all one of two
--    legitimate shapes: event-linked (inserter is that event's host or a
--    guest of it) or a friend request (inserter is the requester) - so the
--    check below can require one of those instead of allowing anything.
-- 3. friendships' committed policies already look correctly scoped to the
--    requester/recipient, but this session has already found committed
--    migrations drifting from the live database twice (event_photos and
--    four other tables' FK cascades) - re-asserting them here costs
--    nothing and rules out the same kind of drift being the real cause
--    here too.
--
-- Every policy is dropped by name (looked up dynamically, not hardcoded)
-- before being recreated, so this is self-healing regardless of whatever
-- is actually live - including any extra permissive policy added outside
-- a migration that would otherwise silently OR itself in over these.

DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['notifications', 'friendships', 'polls', 'poll_votes']
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- notifications: unchanged read/update scope (own rows only); INSERT now
-- requires the inserter to actually have standing to notify that user,
-- instead of accepting any content for any recipient.
CREATE POLICY "users see own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users mark own read" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "notify event members or friend-request recipients" ON public.notifications
  FOR INSERT WITH CHECK (
    (
      data ? 'event_id'
      AND (data->>'event_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND (
        EXISTS (SELECT 1 FROM public.events e WHERE e.id = (data->>'event_id')::uuid AND e.host_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.event_guests g WHERE g.event_id = (data->>'event_id')::uuid AND g.user_id = auth.uid())
      )
    )
    OR (
      type = 'friend_request'
      AND data ? 'requester_id'
      AND (data->>'requester_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND (data->>'requester_id')::uuid = auth.uid()
    )
  );

-- friendships: re-asserting the existing, already-correctly-scoped policies.
CREATE POLICY "view own friendships" ON public.friendships
  FOR SELECT USING (requester_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "send friend requests" ON public.friendships
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "update own friendships" ON public.friendships
  FOR UPDATE USING (requester_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "delete own friendships" ON public.friendships
  FOR DELETE USING (requester_id = auth.uid() OR recipient_id = auth.uid());

-- polls/poll_votes: matches the same "visible to anyone, written only by
-- those with standing" pattern already used for comments/event_guests
-- elsewhere in this app (polls are per-event content guests read on the
-- event page) - polls are host-managed (matches EventView's host-only
-- create/edit/delete UI); poll_votes are cast by their own owner.
CREATE POLICY "polls viewable by everyone" ON public.polls
  FOR SELECT USING (true);

CREATE POLICY "hosts manage their event polls" ON public.polls
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = polls.event_id AND e.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = polls.event_id AND e.host_id = auth.uid()));

CREATE POLICY "poll votes viewable by everyone" ON public.poll_votes
  FOR SELECT USING (true);

CREATE POLICY "users cast their own poll votes" ON public.poll_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users change their own poll votes" ON public.poll_votes
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- A user retracting their own vote, OR the poll's event host clearing all
-- votes when they edit that poll's options (EventView's createPoll does
-- exactly this - delete by poll_id alone, not scoped to one voter).
CREATE POLICY "users or event hosts delete poll votes" ON public.poll_votes
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.polls p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.id = poll_votes.poll_id AND e.host_id = auth.uid()
    )
  );
