-- Restringir bucket mantenimiento-adjuntos por carpeta solicitud_id (primer segmento del path).

CREATE OR REPLACE FUNCTION public.storage_can_access_mantenimiento_solicitud(solicitud_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.solicitudes_mantenimiento sm
    LEFT JOIN public.propiedades p ON p.id = sm.propiedad_id
    WHERE sm.id::text = solicitud_id
      AND (
        public.is_admin_user()
        OR p.user_id = auth.uid()
        OR sm.assigned_to = auth.uid()
      )
  );
$$;

REVOKE ALL ON FUNCTION public.storage_can_access_mantenimiento_solicitud(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_can_access_mantenimiento_solicitud(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_can_access_mantenimiento_solicitud(text) TO service_role;

DROP POLICY IF EXISTS "Usuarios autenticados pueden subir adjuntos de mantenimiento" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver adjuntos de mantenimiento" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar adjuntos de mantenimiento" ON storage.objects;

CREATE POLICY "mantenimiento_adjuntos_select_por_solicitud"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'mantenimiento-adjuntos'
    AND public.storage_can_access_mantenimiento_solicitud((storage.foldername(name))[1])
  );

CREATE POLICY "mantenimiento_adjuntos_insert_por_solicitud"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mantenimiento-adjuntos'
    AND public.storage_can_access_mantenimiento_solicitud((storage.foldername(name))[1])
  );

CREATE POLICY "mantenimiento_adjuntos_delete_por_solicitud"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'mantenimiento-adjuntos'
    AND public.storage_can_access_mantenimiento_solicitud((storage.foldername(name))[1])
  );
