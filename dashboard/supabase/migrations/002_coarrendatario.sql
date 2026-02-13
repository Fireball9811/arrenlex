-- Campos opcionales para registrar el coarrendatario (solo referencia, sin acceso al sistema)
ALTER TABLE arrendatarios
  ADD COLUMN IF NOT EXISTS coarrendatario_nombre TEXT,
  ADD COLUMN IF NOT EXISTS coarrendatario_cedula TEXT,
  ADD COLUMN IF NOT EXISTS coarrendatario_telefono TEXT;
