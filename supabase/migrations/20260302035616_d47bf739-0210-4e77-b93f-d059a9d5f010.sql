
-- Create operational logs table for audit trail
CREATE TABLE public.wa_ops_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  instance_name text,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  latency_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.wa_ops_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only policy
CREATE POLICY "Admins can manage wa_ops_logs"
ON public.wa_ops_logs
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Index for querying by instance and time
CREATE INDEX idx_wa_ops_logs_instance_time ON public.wa_ops_logs (instance_name, created_at DESC);
CREATE INDEX idx_wa_ops_logs_action ON public.wa_ops_logs (action);

-- Add last_webhook_event_at to wa_sessions for heartbeat tracking
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS last_webhook_event_at timestamp with time zone;

-- Enable realtime for ops logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_ops_logs;
