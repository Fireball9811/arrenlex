-- ============================================
-- Migración: Número de recibo ascendente usando id serial
-- Usa una columna numero BIGSERIAL (autonumérica) como número de recibo
-- ============================================

-- Quitar el default anterior de numero_recibo (de la migración 028)
ALTER TABLE recibos_pago
  ALTER COLUMN numero_recibo DROP DEFAULT;

-- Añadir columna numero como BIGSERIAL (autoincremental 1, 2, 3...)
ALTER TABLE recibos_pago
  ADD COLUMN IF NOT EXISTS numero BIGSERIAL UNIQUE;

-- Crear índice para búsquedas por numero
CREATE UNIQUE INDEX IF NOT EXISTS idx_recibos_pago_numero ON recibos_pago(numero);

-- Función para asignar numero_recibo desde numero al insertar
CREATE OR REPLACE FUNCTION set_numero_recibo_from_numero()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_recibo IS NULL AND NEW.numero IS NOT NULL THEN
    NEW.numero_recibo := NEW.numero::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_numero_recibo ON recibos_pago;
CREATE TRIGGER trigger_set_numero_recibo
  BEFORE INSERT OR UPDATE ON recibos_pago
  FOR EACH ROW
  EXECUTE FUNCTION set_numero_recibo_from_numero();

-- Actualizar recibos existentes que no tengan numero_recibo
UPDATE recibos_pago
SET numero_recibo = numero::TEXT
WHERE numero_recibo IS NULL AND numero IS NOT NULL;

COMMENT ON COLUMN recibos_pago.numero IS 'Número secuencial ascendente del recibo (autoincremental, 1, 2, 3...)';
