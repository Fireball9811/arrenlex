-- Migración: Aumentar límite de tamaño de archivos en buckets de propiedades
-- Fotos y Videos: máximo 50MB

-- Actualizar bucket de propiedades (imágenes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'propiedades',
  'propiedades',
  true,
  52428800,  -- 50 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit;

-- Actualizar bucket de videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'propiedades-videos',
  'propiedades-videos',
  true,
  52428800,  -- 50 MB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit;
