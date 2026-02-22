
-- Create platform_settings key-value table
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage platform_settings"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Auto-update updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('ai_system_prompt', '"Kamu adalah asisten customer service yang ramah dan profesional. Jawab pertanyaan berdasarkan konteks yang diberikan. Jika kamu tidak tahu jawabannya atau pelanggan meminta berbicara dengan manusia, balas HANYA dengan kata ESKALASI_HUMAN."'),
  ('ai_model', '"google/gemini-2.5-flash-lite"'),
  ('ai_temperature', '0.3'),
  ('ai_max_tokens', '1024'),
  ('default_daily_message_limit', '300'),
  ('default_quota_limit', '1000'),
  ('anti_ban_delay_min', '2'),
  ('anti_ban_delay_max', '4'),
  ('escalation_message', '"Mohon tunggu, saya sedang menyambungkan Anda dengan Admin kami."');
