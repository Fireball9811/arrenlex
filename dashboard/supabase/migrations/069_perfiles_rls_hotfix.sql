-- Hotfix: evitar bloqueos de lectura en perfiles tras migración 066.
-- is_admin_user() debe leer perfiles sin quedar atrapado en RLS.

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;

-- Asegurar políticas mínimas (idempotente)
DROP POLICY IF EXISTS "perfiles_select_own_or_admin" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_insert_own" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update_own_or_admin" ON public.perfiles;

CREATE POLICY "perfiles_select_own_or_admin"
  ON public.perfiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin_user());

CREATE POLICY "perfiles_insert_own"
  ON public.perfiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "perfiles_update_own_or_admin"
  ON public.perfiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin_user())
  WITH CHECK (id = auth.uid() OR public.is_admin_user());
