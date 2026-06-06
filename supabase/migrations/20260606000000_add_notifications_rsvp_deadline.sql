-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb default '{}',
  read boolean default false,
  created_at timestamptz default now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "service can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "users mark own read" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- RSVP deadline on events
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_deadline timestamptz;
