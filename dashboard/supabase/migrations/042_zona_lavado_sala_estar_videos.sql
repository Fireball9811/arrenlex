-- Migración: nuevas categorías de imagen + tabla de videos de propiedades

-- ============================================================
-- 1. AGREGAR zona_lavado y sala_estar al constraint de imágenes
-- ============================================================
ALTER TABLE propiedades_imagenes
  DROP CONSTRAINT IF EXISTS propiedades_imagenes_categoria_check;

ALTER TABLE propiedades_imagenes
  ADD CONSTRAINT propiedades_imagenes_categoria_check
  CHECK (categoria IN (
    'principal',
    'sala',
    'sala_estar',
    'comedor',
    'cocina',
    'habitacion',
    'bano',
    'zona_lavado',
    'parqueadero',
    'deposito',
    'fachada',
    'otra'
  ));

COMMENT ON COLUMN propiedades_imagenes.categoria IS
  'Categoria de la imagen: principal, sala, sala_estar, comedor, cocina, habitacion, bano, zona_lavado, parqueadero, deposito, fachada, otra';

-- ============================================================
-- 2. TABLA DE VIDEOS DE PROPIEDADES
-- ============================================================
CREATE TABLE IF NOT EXISTS propiedades_videos (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id   UUID        NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  nombre_archivo TEXT        NOT NULL,
  url_publica    TEXT        NOT NULL,
  storage_path   TEXT        NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE propiedades_videos IS 'Video general de cada propiedad (máx. 1 por propiedad)';

CREATE INDEX IF NOT EXISTS idx_propiedades_videos_propiedad_id
  ON propiedades_videos(propiedad_id);

-- ============================================================
-- 3. RLS EN propiedades_videos
-- ============================================================
ALTER TABLE propiedades_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden ver videos de propiedades"
  ON propiedades_videos FOR SELECT USING (true);

CREATE POLICY "Propietarios y admins pueden insertar videos"
  ON propiedades_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM propiedades
      WHERE propiedades.id = propiedades_videos.propiedad_id
        AND propiedades.user_id = auth.uid()
    )
  );

CREATE POLICY "Propietarios y admins pueden eliminar videos"
  ON propiedades_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM propiedades
      WHERE propiedades.id = propiedades_videos.propiedad_id
        AND propiedades.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. BUCKET DE STORAGE PARA VIDEOS (512 MB por archivo)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'propiedades-videos',
  'propiedades-videos',
  true,
  536870912,   -- 512 MB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquiera puede ver los videos (bucket público)
CREATE POLICY "Usuarios pueden ver videos de propiedades"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'propiedades-videos');

-- Política: usuarios autenticados pueden subir videos
CREATE POLICY "Usuarios autenticados pueden subir videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'propiedades-videos'
    AND auth.uid() IS NOT NULL
  );

-- Política: usuarios autenticados pueden eliminar sus propios videos
CREATE POLICY "Usuarios pueden eliminar sus videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'propiedades-videos'
    AND auth.uid() IS NOT NULL
  );
