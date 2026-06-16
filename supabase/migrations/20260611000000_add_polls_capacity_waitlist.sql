CREATE TABLE IF NOT EXISTS polls (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade,
  question text not null,
  options jsonb not null,
  chosen_option text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references polls(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  option text not null,
  created_at timestamptz default now(),
  unique(poll_id, user_id)
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity int;
ALTER TABLE events ADD COLUMN IF NOT EXISTS waitlist jsonb default '[]';
