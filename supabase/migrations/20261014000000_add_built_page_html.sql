-- Build It stores a complete, self-contained generated HTML page per event.
-- Nullable: an event has no built page until the host generates one, and the
-- frontend treats NULL as "show the Build It entry point".
ALTER TABLE events ADD COLUMN IF NOT EXISTS built_page_html TEXT;
