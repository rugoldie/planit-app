-- Ensure the unique constraint exists so upsert with on_conflict=poll_id,user_id works.
-- Uses a unique index (IF NOT EXISTS) which is safe to run even if the constraint already exists.
CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_poll_user_unique ON poll_votes (poll_id, user_id);
