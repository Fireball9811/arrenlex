-- ============================================
-- MIGRACIÓN: Limpiar duplicados y agregar restricción única
-- ============================================

-- Todo en un solo bloque para evitar problemas de tablas temporales
DO $$
DECLARE
  deleted_count INTEGER;
  remaining_duplicates INTEGER;
BEGIN
  RAISE NOTICE '=== LIMPIANDO DUPLICADOS DE CONTRATOS ===';

  -- Eliminar duplicados manteniendo el más antiguo
  WITH duplicados AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY arrendatario_id, fecha_inicio, estado
        ORDER BY created_at ASC, id ASC
      ) as row_num
    FROM contratos
  )
  DELETE FROM contratos
  WHERE id IN (SELECT id FROM duplicados WHERE row_num > 1);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Contratos duplicados eliminados: %', deleted_count;

  -- Verificar que no quedan duplicados
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT arrendatario_id, fecha_inicio, estado
    FROM contratos
    GROUP BY arrendatario_id, fecha_inicio, estado
    HAVING COUNT(*) > 1
  ) sub;

  IF remaining_duplicates > 0 THEN
    RAISE EXCEPTION 'Aún quedan % duplicados', remaining_duplicates;
  END IF;

  RAISE NOTICE '✓ No hay duplicados. Creando índice único...';

  -- Crear índice único
  CREATE UNIQUE INDEX IF NOT EXISTS idx_contratos_arrendatario_fecha_estado_unique
  ON contratos(arrendatario_id, fecha_inicio, estado);

  RAISE NOTICE '✓ Índice único creado exitosamente';
END $$;

COMMENT ON INDEX idx_contratos_arrendatario_fecha_estado_unique
IS 'Previene contratos duplicados: mismo arrendatario, misma fecha de inicio y mismo estado';
