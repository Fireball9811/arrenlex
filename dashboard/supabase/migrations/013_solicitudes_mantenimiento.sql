-- Migración: tabla solicitudes_mantenimiento para reportes de mantenimiento por inquilinos.
-- Inquilino envía nombre, detalle del problema y desde cuándo; se guardan con referencia a la propiedad.
-- Acceso: admin ve todas; propietario solo las de sus propiedades; inquilino solo crea.

-- ============================================
-- 1. CREAR TABLA solicitudes_mantenimiento
-- ============================================
CREATE TABLE IF NOT EXISTS solicitudes_mantenimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  detalle TEXT NOT NULL,
  desde_cuando TEXT NOT NULL,
  responsable TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'ejecucion', 'completado')),
  arrendatario_id UUID REFERENCES arrendatarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE solicitudes_mantenimiento IS 'Solicitudes de mantenimiento reportadas por inquilinos';
COMMENT ON COLUMN solicitudes_mantenimiento.propiedad_id IS 'Propiedad donde se reporta el problema';
COMMENT ON COLUMN solicitudes_mantenimiento.nombre_completo IS 'Nombre completo del reportante';
COMMENT ON COLUMN solicitudes_mantenimiento.detalle IS 'Descripción del problema';
COMMENT ON COLUMN solicitudes_mantenimiento.desde_cuando IS 'Desde cuándo está el problema (texto libre)';
COMMENT ON COLUMN solicitudes_mantenimiento.responsable IS 'Persona asignada para atender (opcional)';
COMMENT ON COLUMN solicitudes_mantenimiento.status IS 'Estado: pendiente, ejecucion, completado';
COMMENT ON COLUMN solicitudes_mantenimiento.arrendatario_id IS 'Arrendatario que reportó (opcional)';

-- ============================================
-- 2. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_propiedad_id ON solicitudes_mantenimiento(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_status ON solicitudes_mantenimiento(status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_created_at ON solicitudes_mantenimiento(created_at);

-- RLS: no habilitado; el acceso se controla en las APIs.
