-- Agregar campo para lugar de expedición de cédula del coarrendatario
-- en la tabla arrendatarios (no existe actualmente)

ALTER TABLE arrendatarios
  ADD COLUMN IF NOT EXISTS coarrendatario_cedula_expedicion TEXT;

COMMENT ON COLUMN arrendatarios.coarrendatario_cedula_expedicion
  IS 'Ciudad de expedición de la cédula del coarrendatario';
