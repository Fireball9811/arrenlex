-- Restringir bucket "documentos" por carpeta: contratos/*, terminaciones/* o carpeta personal del usuario.

CREATE OR REPLACE FUNCTION public.storage_can_access_contrato_folder(folder_contrato_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contratos c
    LEFT JOIN public.arrendatarios a ON a.id = c.arrendatario_id
    WHERE c.id::text = folder_contrato_id
      AND (
        public.is_admin_user()
        OR c.user_id = auth.uid()
        OR (a.user_id IS NOT NULL AND a.user_id = auth.uid())
      )
  );
$$;

REVOKE ALL ON FUNCTION public.storage_can_access_contrato_folder(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_can_access_contrato_folder(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_can_access_contrato_folder(text) TO service_role;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos" ON storage.objects;

CREATE POLICY "documentos_select_por_acceso"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('contratos', 'terminaciones')
        AND public.storage_can_access_contrato_folder((storage.foldername(name))[2])
      )
    )
  );

CREATE POLICY "documentos_insert_por_acceso"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('contratos', 'terminaciones')
        AND public.storage_can_access_contrato_folder((storage.foldername(name))[2])
      )
    )
  );

CREATE POLICY "documentos_delete_por_acceso"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('contratos', 'terminaciones')
        AND public.storage_can_access_contrato_folder((storage.foldername(name))[2])
      )
    )
  );
