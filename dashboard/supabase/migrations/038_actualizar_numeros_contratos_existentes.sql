-- Actualizar numeros de contrato para registros existentes
-- Ejecutar despues de la migracion 037

-- Primero, verificar si la columna numero existe y tiene valores NULL
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Contar contratos sin numero
  SELECT COUNT(*) INTO v_count
  FROM contratos
  WHERE numero IS NULL;

  RAISE NOTICE 'Contratos sin numero: %', v_count;

  IF v_count > 0 THEN
    -- Asignar numeros a contratos existentes
    -- Usamos ROW_NUMBER() para asignar numeros consecutivos
    WITH contratos_con_numeros AS (
      SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at) AS new_numero
      FROM contratos
      WHERE numero IS NULL
    )
    UPDATE contratos c
    SET numero = cn.new_numero
    FROM contratos_con_numeros cn
    WHERE c.id = cn.id;

    RAISE NOTICE 'Se asignaron numeros a % contratos', v_count;
  END IF;
END $$;

-- Actualizar la secuencia para que el siguiente valor sea mayor que el maximo existente
DO $$
DECLARE
  v_max_numero INTEGER;
BEGIN
  -- Obtener el maximo numero de contrato
  SELECT COALESCE(MAX(numero), 0) INTO v_max_numero
  FROM contratos;

  -- Reiniciar la secuencia con el siguiente valor
  PERFORM setval('contratos_numero_seq', v_max_numero, true);

  RAISE NOTICE 'Secuencia reiniciada. Siguiente valor: %', v_max_numero + 1;
END $$;
