-- Migración 033: Sincronización de numero_matricula entre tablas
-- Agrega numero_matricula a recibos_pago y crea trigger para mantener sincronización

-- ============================================
-- 1. AGREGAR COLUMNA numero_matricula A recibos_pago
-- ============================================
ALTER TABLE recibos_pago
  ADD COLUMN IF NOT EXISTS numero_matricula TEXT;

COMMENT ON COLUMN recibos_pago.numero_matricula IS 'Número de matrícula de la propiedad (sincronizado desde propiedades.numero_matricula)';

-- ============================================
-- 2. ACTUALIZAR REGISTROS EXISTENTES
-- ============================================
UPDATE recibos_pago rp
SET numero_matricula = p.numero_matricula
FROM propiedades p
WHERE rp.propiedad_id = p.id
  AND p.numero_matricula IS NOT NULL
  AND p.numero_matricula != '';

-- ============================================
-- 3. FUNCIÓN DE SINCRONIZACIÓN
-- ============================================
CREATE OR REPLACE FUNCTION sync_numero_matricula_to_recibos()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando se actualiza numero_matricula en propiedades, actualizarlo en recibos_pago
  IF NEW.numero_matricula IS DISTINCT FROM OLD.numero_matricula THEN
    UPDATE recibos_pago
    SET numero_matricula = NEW.numero_matricula
    WHERE propiedad_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_numero_matricula_to_recibos() IS 'Sincroniza numero_matricula desde propiedades hacia recibos_pago cuando se actualiza';

-- ============================================
-- 4. TRIGGER PARA SINCRONIZACIÓN AUTOMÁTICA
-- ============================================
DROP TRIGGER IF EXISTS trigger_sync_numero_matricula ON propiedades;

CREATE TRIGGER trigger_sync_numero_matricula
  AFTER UPDATE OF numero_matricula ON propiedades
  FOR EACH ROW
  WHEN (OLD.numero_matricula IS DISTINCT FROM NEW.numero_matricula)
  EXECUTE FUNCTION sync_numero_matricula_to_recibos();

-- ============================================
-- 5. ÍNDICE PARA CONSULTAS EFICIENTES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_recibos_pago_numero_matricula ON recibos_pago(numero_matricula)
  WHERE numero_matricula IS NOT NULL AND numero_matricula != '';

-- ============================================
-- 6. FUNCIÓN PARA OBTENER numero_matricula DESDE CUALQUIER TABLA RELACIONADA
-- ============================================
CREATE OR REPLACE FUNCTION get_propiedad_numero_matricula(p_propiedad_id UUID)
RETURNS TEXT AS $$
DECLARE
  matricula TEXT;
BEGIN
  SELECT numero_matricula INTO matricula
  FROM propiedades
  WHERE id = p_propiedad_id;

  RETURN matricula;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_propiedad_numero_matricula(UUID) IS 'Obtiene el numero_matricula de una propiedad por su ID';
