-- Migracion para sistema de imagenes de propiedades
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. CREAR TABLA DE IMAGENES DE PROPIEDADES
-- ============================================
CREATE TABLE IF NOT EXISTS propiedades_imagenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN ('sala', 'cocina', 'habitacion', 'bano', 'fachada', 'otra')),
  nombre_archivo TEXT NOT NULL,
  url_publica TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios para documentar
COMMENT ON TABLE propiedades_imagenes IS 'Imagenes de propiedades organizadas por categoria';
COMMENT ON COLUMN propiedades_imagenes.propiedad_id IS 'ID de la propiedad asociada';
COMMENT ON COLUMN propiedades_imagenes.categoria IS 'Categoria de la imagen (sala, cocina, habitacion, bano, fachada, otra)';
COMMENT ON COLUMN propiedades_imagenes.nombre_archivo IS 'Nombre del archivo original';
COMMENT ON COLUMN propiedades_imagenes.url_publica IS 'URL publica de la imagen en storage';
COMMENT ON COLUMN propiedades_imagenes.orden IS 'Orden para mostrar la imagen';

-- ============================================
-- 2. CREAR BUCKET DE STORAGE PARA PROPIEDADES
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'propiedades',
  'propiedades',
  true,  -- Publico para que inquilinos puedan ver las imagenes
  10485760,  -- 10 MB por imagen
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. INDICES PARA RENDIMIENTO
-- ============================================
CREATE INDEX IF NOT EXISTS idx_propiedades_imagenes_propiedad_id ON propiedades_imagenes(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_propiedades_imagenes_categoria ON propiedades_imagenes(categoria);
CREATE INDEX IF NOT EXISTS idx_propiedades_imagenes_orden ON propiedades_imagenes(orden);

-- ============================================
-- 4. POLITICAS RLS PARA IMAGENES
-- ============================================
ALTER TABLE propiedades_imagenes ENABLE ROW LEVEL SECURITY;

-- Politica: Los usuarios pueden ver imagenes de propiedades publicas
CREATE POLICY "Todos pueden ver imagenes de propiedades"
  ON propiedades_imagenes FOR SELECT
  USING (true);

-- Politica: Los propietarios pueden insertar imagenes en sus propiedades
CREATE POLICY "Propietarios pueden insertar imagenes"
  ON propiedades_imagenes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM propiedades
      WHERE propiedades.id = propiedades_imagenes.propiedad_id
      AND propiedades.user_id = auth.uid()
    )
  );

-- Politica: Los propietarios pueden eliminar imagenes de sus propiedades
CREATE POLICY "Propietarios pueden eliminar imagenes"
  ON propiedades_imagenes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM propiedades
      WHERE propiedades.id = propiedades_imagenes.propiedad_id
      AND propiedades.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. POLITICAS DE STORAGE PARA PROPIEDADES
-- ============================================
-- Politica: Los usuarios pueden listar imagenes
CREATE POLICY "Usuarios pueden listar imagenes de propiedades"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'propiedades');

-- Politica: Los propietarios pueden subir imagenes a sus propiedades
CREATE POLICY "Propietarios pueden subir imagenes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'propiedades'
    AND (
      -- El nombre del archivo debe empezar con user_id/propiedad_id/
      (storage.foldername(name))[1] = (auth.uid())::text
      OR auth.uid() IS NOT NULL
    )
  );

-- Politica: Los propietarios pueden eliminar imagenes de sus propiedades
CREATE POLICY "Propietarios pueden eliminar imagenes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'propiedades'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR auth.uid() IS NOT NULL
    )
  );

-- ============================================
-- 6. FUNCION PARA OBTENER IMAGENES DE UNA PROPIEDAD
-- ============================================
CREATE OR REPLACE FUNCTION obtener_imagenes_propiedad(p_propiedad_id UUID)
RETURNS TABLE(
  id UUID,
  categoria TEXT,
  nombre_archivo TEXT,
  url_publica TEXT,
  orden INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id,
    pi.categoria,
    pi.nombre_archivo,
    pi.url_publica,
    pi.orden
  FROM propiedades_imagenes pi
  WHERE pi.propiedad_id = p_propiedad_id
  ORDER BY pi.categoria, pi.orden, pi.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION obtener_imagenes_propiedad IS 'Retorna todas las imagenes de una propiedad ordenadas';

-- ============================================
-- 7. FUNCIÓN PARA OBTENER CIUDADES CON PROPIEDADES DISPONIBLES
-- ============================================
CREATE OR REPLACE FUNCTION obtener_ciudades_disponibles()
RETURNS TABLE(ciudad TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ciudad
  FROM propiedades
  WHERE estado = 'disponible'
    AND ciudad IS NOT NULL
    AND ciudad != ''
  ORDER BY ciudad;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION obtener_ciudades_disponibles IS 'Retorna lista de ciudades con propiedades disponibles';
