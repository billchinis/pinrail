-- Where a decision or a discard was made, as the client that sent it says:
-- the app, the pinrail CLI, or another client of the API. NULL for the
-- outcomes recorded before this was kept, and for withdrawals.
ALTER TABLE outcomes ADD COLUMN via TEXT CHECK (via IN ('app', 'cli', 'api'));
-- the agent's session the CLI ran in when it decided or discarded, if any
ALTER TABLE outcomes ADD COLUMN session TEXT;
