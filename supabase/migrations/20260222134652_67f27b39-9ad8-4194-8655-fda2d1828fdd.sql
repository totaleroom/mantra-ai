
-- Fix RLS: Drop old policies, recreate with TO authenticated + WITH CHECK

-- clients
DROP POLICY IF EXISTS "Admins can manage clients" ON clients;
CREATE POLICY "Admins can manage clients" ON clients
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- documents
DROP POLICY IF EXISTS "Admins can manage documents" ON documents;
CREATE POLICY "Admins can manage documents" ON documents
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- wa_sessions
DROP POLICY IF EXISTS "Admins can manage wa_sessions" ON wa_sessions;
CREATE POLICY "Admins can manage wa_sessions" ON wa_sessions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- message_logs
DROP POLICY IF EXISTS "Admins can manage message_logs" ON message_logs;
CREATE POLICY "Admins can manage message_logs" ON message_logs
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- billing_alerts
DROP POLICY IF EXISTS "Admins can manage billing_alerts" ON billing_alerts;
CREATE POLICY "Admins can manage billing_alerts" ON billing_alerts
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- user_roles
DROP POLICY IF EXISTS "Admins can manage user_roles" ON user_roles;
CREATE POLICY "Admins can manage user_roles" ON user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
