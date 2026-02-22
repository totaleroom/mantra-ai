
-- Drop existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can manage wa_sessions" ON public.wa_sessions;
DROP POLICY IF EXISTS "Admins can manage message_logs" ON public.message_logs;
DROP POLICY IF EXISTS "Admins can manage billing_alerts" ON public.billing_alerts;
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;

-- Create PERMISSIVE policies for admin access on all tables
CREATE POLICY "Admins can manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage documents"
  ON public.documents FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage wa_sessions"
  ON public.wa_sessions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage message_logs"
  ON public.message_logs FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage billing_alerts"
  ON public.billing_alerts FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage user_roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
