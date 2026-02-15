-- Migración: tabla solicitudes_visita para solicitudes de visita a propiedades.
-- Los visitantes envían nombre, celular, email y nota; se guardan con referencia a la propiedad.
-- Acceso a los datos vía API (solo admin y propietario de la propiedad).

-- ============================================
-- 1. CREAR TABLA solicitudes_visita
-- ============================================
CREATE TABLE IF NOT EXISTS solicitudes_visita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  celular TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'contestado', 'esperando')),
  propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  nota TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE solicitudes_visita IS 'Solicitudes de visita a propiedades desde el catálogo público';
COMMENT ON COLUMN solicitudes_visita.nombre_completo IS 'Nombre completo del solicitante';
COMMENT ON COLUMN solicitudes_visita.celular IS 'Número celular';
COMMENT ON COLUMN solicitudes_visita.email IS 'Correo electrónico';
COMMENT ON COLUMN solicitudes_visita.status IS 'Estado: pendiente, contestado, esperando';
COMMENT ON COLUMN solicitudes_visita.propiedad_id IS 'Referencia a la propiedad que se quiere visitar';
COMMENT ON COLUMN solicitudes_visita.nota IS 'Nota o comentario adicional del solicitante';

-- ============================================
-- 2. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_solicitudes_visita_propiedad_id ON solicitudes_visita(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_visita_status ON solicitudes_visita(status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_visita_created_at ON solicitudes_visita(created_at);

-- RLS: no habilitado; el acceso se controla en las APIs (solo admin o propietario de la propiedad).
