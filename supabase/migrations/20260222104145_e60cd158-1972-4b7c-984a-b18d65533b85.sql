
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin');

-- User roles table (security best practice: roles in separate table)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Convenience wrapper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- RLS for user_roles: only admins can manage
CREATE POLICY "Admins can manage user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  subscription_plan text NOT NULL DEFAULT 'basic',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  quota_remaining integer NOT NULL DEFAULT 1000,
  quota_limit integer NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.is_admin());

-- WA Sessions table
CREATE TABLE public.wa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected')),
  qr_code text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wa_sessions"
  ON public.wa_sessions FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Enable Realtime for wa_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_sessions;

-- Documents table (for RAG/Knowledge Base)
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text,
  content text,
  embedding extensions.vector(1536),
  chunk_index integer DEFAULT 0,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Message logs table
CREATE TABLE public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  message_count integer NOT NULL DEFAULT 0,
  token_usage integer NOT NULL DEFAULT 0,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage message_logs"
  ON public.message_logs FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Billing alerts table
CREATE TABLE public.billing_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('quota_low', 'expiring')),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage billing_alerts"
  ON public.billing_alerts FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_sessions_updated_at
  BEFORE UPDATE ON public.wa_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge', 'knowledge', false);

-- Storage policies for knowledge bucket (admin only)
CREATE POLICY "Admins can upload knowledge files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'knowledge' AND public.is_admin());

CREATE POLICY "Admins can view knowledge files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'knowledge' AND public.is_admin());

CREATE POLICY "Admins can delete knowledge files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'knowledge' AND public.is_admin());

-- Index for document embedding similarity search
CREATE INDEX idx_documents_embedding ON public.documents
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

-- Index for message_logs queries
CREATE INDEX idx_message_logs_client_date ON public.message_logs (client_id, log_date);
