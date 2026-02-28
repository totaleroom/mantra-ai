
-- Drop existing CHECK constraint on wa_sessions.status (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'wa_sessions_status_check'
    AND table_name = 'wa_sessions'
  ) THEN
    ALTER TABLE wa_sessions DROP CONSTRAINT wa_sessions_status_check;
  END IF;
END $$;

-- Add updated constraint allowing 'connecting'
ALTER TABLE wa_sessions ADD CONSTRAINT wa_sessions_status_check 
  CHECK (status IN ('connected', 'disconnected', 'connecting'));
