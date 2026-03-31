-- Migración: Agregar campo llave_bancaria a propiedades

ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS llave_bancaria TEXT;

COMMENT ON COLUMN propiedades.llave_bancaria IS 'Llave bancaria o llave de registro para transferencias (opcional)';
