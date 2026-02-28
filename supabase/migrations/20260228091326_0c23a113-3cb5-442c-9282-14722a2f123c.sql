
-- Drop the unique constraint on client_id to allow multi-instance per client
ALTER TABLE public.wa_sessions DROP CONSTRAINT IF EXISTS wa_sessions_client_id_key;

-- Add composite unique constraint
ALTER TABLE public.wa_sessions ADD CONSTRAINT wa_sessions_client_instance_unique UNIQUE (client_id, instance_name);

-- Add last_error column for better error visibility
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS last_error text;

-- Update status check constraint to include 'error'
ALTER TABLE public.wa_sessions DROP CONSTRAINT IF EXISTS wa_sessions_status_check;
ALTER TABLE public.wa_sessions ADD CONSTRAINT wa_sessions_status_check CHECK (status IN ('connected', 'disconnected', 'connecting', 'error'));

-- Add operational indexes
CREATE INDEX IF NOT EXISTS idx_wa_sessions_client_updated ON public.wa_sessions (client_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_instance_name ON public.wa_sessions (instance_name);
