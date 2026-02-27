
-- Add instance_name column to wa_sessions to track Evolution API instance name
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS instance_name text;

-- Create index for faster lookup by instance_name
CREATE INDEX IF NOT EXISTS idx_wa_sessions_instance_name ON public.wa_sessions(instance_name);
