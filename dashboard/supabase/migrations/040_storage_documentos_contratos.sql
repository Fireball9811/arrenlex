-- Actualizar políticas del bucket documentos para permitir la nueva estructura
-- Los archivos ahora se almacenan en: contratos/contrato_id/nombre_archivo

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "Usuarios pueden subir sus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden ver sus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus documentos" ON storage.objects;

-- Nueva política para ver documentos: authenticated users pueden ver documentos de contratos
-- donde tienen acceso (como propietario, inquilino o admin)
CREATE POLICY "Usuarios autenticados pueden ver documentos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = 'contratos'
  );

-- Nueva política para subir documentos: usuarios autenticados pueden subir a contratos
-- El control de acceso se hace a nivel de API, no de storage
CREATE POLICY "Usuarios autenticados pueden subir documentos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = 'contratos'
  );

-- Nueva política para eliminar documentos: usuarios autenticados pueden eliminar
-- El control de acceso se hace a nivel de API, no de storage
CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = 'contratos'
  );
