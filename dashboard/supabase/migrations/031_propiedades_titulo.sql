-- Agregar campo titulo a propiedades
ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS titulo TEXT;
