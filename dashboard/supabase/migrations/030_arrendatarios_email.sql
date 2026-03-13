-- Agregar email para arrendatario principal y coarrendatario
ALTER TABLE arrendatarios
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS coarrendatario_email TEXT;
