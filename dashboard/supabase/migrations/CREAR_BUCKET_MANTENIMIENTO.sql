-- ============================================================================
-- CREAR BUCKET DE MANTENIMIENTO-ADJUNTOS
-- Ejecutar en Supabase → SQL Editor
-- ============================================================================

-- Insertar el bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mantenimiento-adjuntos',
  'mantenimiento-adjuntos',
  false,
  10485760,  -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Verificar que se creó
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'mantenimiento-adjuntos';

-- Crear políticas de storage
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir adjuntos de mantenimiento" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver adjuntos de mantenimiento" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar adjuntos de mantenimiento" ON storage.objects;

CREATE POLICY "Usuarios autenticados pueden subir adjuntos de mantenimiento"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'mantenimiento-adjuntos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Usuarios autenticados pueden ver adjuntos de mantenimiento"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'mantenimiento-adjuntos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Usuarios autenticados pueden eliminar adjuntos de mantenimiento"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'mantenimiento-adjuntos'
    AND auth.uid() IS NOT NULL
  );
