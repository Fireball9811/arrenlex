-- Migración 050: Índices de optimización para escala
-- Cada bloque DO verifica que la tabla exista antes de crear el índice.
-- Es seguro ejecutar más de una vez y en cualquier estado de la DB.

DO $$ BEGIN

  -- 1. propiedades.estado
  -- Catálogo público filtra siempre por estado = 'disponible'.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'propiedades') THEN
    CREATE INDEX IF NOT EXISTS idx_propiedades_estado ON propiedades(estado);
    RAISE NOTICE 'idx_propiedades_estado: OK';
  END IF;

  -- 2. propiedades(estado, ciudad) — compuesto
  -- Filtro por estado + ciudad simultáneo en el catálogo.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'propiedades') THEN
    CREATE INDEX IF NOT EXISTS idx_propiedades_estado_ciudad ON propiedades(estado, ciudad);
    RAISE NOTICE 'idx_propiedades_estado_ciudad: OK';
  END IF;

  -- 3. arrendatarios.cedula
  -- Búsqueda por cédula en admin y validación de duplicados.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'arrendatarios') THEN
    CREATE INDEX IF NOT EXISTS idx_arrendatarios_cedula ON arrendatarios(cedula);
    RAISE NOTICE 'idx_arrendatarios_cedula: OK';
  END IF;

  -- 4. arrendatarios.email
  -- Búsqueda por email en admin e intake.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'arrendatarios') THEN
    CREATE INDEX IF NOT EXISTS idx_arrendatarios_email ON arrendatarios(email);
    RAISE NOTICE 'idx_arrendatarios_email: OK';
  END IF;

  -- 5. contratos(estado, user_id) — compuesto
  -- Dashboard propietario: mis contratos activos.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contratos') THEN
    CREATE INDEX IF NOT EXISTS idx_contratos_estado_user_id ON contratos(estado, user_id);
    RAISE NOTICE 'idx_contratos_estado_user_id: OK';
  END IF;

  -- 6. contratos.fecha_fin
  -- Cron de notificaciones: contratos que vencen en los próximos 5 días.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contratos') THEN
    CREATE INDEX IF NOT EXISTS idx_contratos_fecha_fin ON contratos(fecha_fin);
    RAISE NOTICE 'idx_contratos_fecha_fin: OK';
  END IF;

  -- 7. pagos(contrato_id, estado) — compuesto
  -- Pagos pendientes por contrato: consulta más frecuente del dashboard.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pagos') THEN
    CREATE INDEX IF NOT EXISTS idx_pagos_contrato_estado ON pagos(contrato_id, estado);
    RAISE NOTICE 'idx_pagos_contrato_estado: OK';
  END IF;

END $$;
