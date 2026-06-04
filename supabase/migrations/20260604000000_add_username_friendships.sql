-- Add username column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text unique;

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz default now(),
  unique(requester_id, recipient_id)
);

-- Row-level security
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own friendships" ON friendships
  FOR SELECT USING (requester_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "send friend requests" ON friendships
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "update own friendships" ON friendships
  FOR UPDATE USING (requester_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "delete own friendships" ON friendships
  FOR DELETE USING (requester_id = auth.uid() OR recipient_id = auth.uid());
