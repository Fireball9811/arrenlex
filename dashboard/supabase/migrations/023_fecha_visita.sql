-- Migración: agregar fecha_visita a solicitudes_visita
-- Permite que el solicitante indique cuándo prefiere la visita (lun-dom 08:00-17:00).

ALTER TABLE solicitudes_visita
  ADD COLUMN IF NOT EXISTS fecha_visita TIMESTAMPTZ;

COMMENT ON COLUMN solicitudes_visita.fecha_visita IS 'Fecha y hora preferida para la visita (lun-dom 08:00-17:00). Null = sin preferencia específica.';
