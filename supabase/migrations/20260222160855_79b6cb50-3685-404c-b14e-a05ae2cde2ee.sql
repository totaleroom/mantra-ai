
-- Tabel wa_customers
CREATE TABLE public.wa_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, phone_number)
);

ALTER TABLE public.wa_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wa_customers"
  ON public.wa_customers FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tabel wa_conversations
CREATE TABLE public.wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.wa_customers(id) ON DELETE CASCADE,
  handled_by text NOT NULL DEFAULT 'AI',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wa_conversations"
  ON public.wa_conversations FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER update_wa_conversations_updated_at
  BEFORE UPDATE ON public.wa_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabel wa_messages
CREATE TABLE public.wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wa_messages"
  ON public.wa_messages FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tambah role_tag ke documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS role_tag text;

-- Tambah daily_message_limit ke clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS daily_message_limit integer NOT NULL DEFAULT 300;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_messages;
