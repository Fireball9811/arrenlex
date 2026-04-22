-- =========================================================
-- Migración: Terminación de contratos
-- Añade estado 'pendiente_cierre' a contratos, crea tablas
-- terminaciones_contrato y terminacion_registros y políticas
-- de storage para la carpeta terminaciones/.
-- =========================================================

-- 1) Ampliar el CHECK de estado en contratos
ALTER TABLE contratos DROP CONSTRAINT IF EXISTS contratos_estado_check;

ALTER TABLE contratos
  ADD CONSTRAINT contratos_estado_check
  CHECK (estado IN ('borrador', 'activo', 'terminado', 'vencido', 'pendiente_cierre'));

-- 2) Tabla terminaciones_contrato (1:1 con contratos)
CREATE TABLE IF NOT EXISTS terminaciones_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL UNIQUE REFERENCES contratos(id) ON DELETE CASCADE,

  -- Depósito y fecha de entrega del inmueble
  deposito NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_entrega DATE,

  -- Lecturas de medidores y valores según recibo
  lectura_agua TEXT,
  valor_agua NUMERIC(14,2) NOT NULL DEFAULT 0,
  lectura_gas TEXT,
  valor_gas NUMERIC(14,2) NOT NULL DEFAULT 0,
  lectura_energia TEXT,
  valor_energia NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Notas u observaciones del propietario
  notas TEXT,

  -- Estado de la terminación
  finalizado BOOLEAN NOT NULL DEFAULT FALSE,
  finalizado_en TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terminaciones_contrato_contrato
  ON terminaciones_contrato(contrato_id);

COMMENT ON TABLE terminaciones_contrato IS 'Registro de la liquidación de terminación de un contrato';
COMMENT ON COLUMN terminaciones_contrato.deposito IS 'Depósito/garantía entregada por el inquilino';
COMMENT ON COLUMN terminaciones_contrato.finalizado IS 'Marca cuando el propietario cierra definitivamente';

-- 3) Tabla terminacion_registros (N registros por terminación)
CREATE TABLE IF NOT EXISTS terminacion_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terminacion_id UUID NOT NULL REFERENCES terminaciones_contrato(id) ON DELETE CASCADE,

  descripcion TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  foto_url TEXT, -- ruta dentro del bucket 'documentos' (terminaciones/<contrato_id>/<archivo>)
  orden INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terminacion_registros_terminacion
  ON terminacion_registros(terminacion_id);

COMMENT ON TABLE terminacion_registros IS 'Registros individuales de daños/anotaciones con foto y valor';

-- 4) Trigger updated_at para terminaciones_contrato
CREATE OR REPLACE FUNCTION update_terminaciones_contrato_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_terminaciones_contrato_updated_at ON terminaciones_contrato;

CREATE TRIGGER trigger_terminaciones_contrato_updated_at
  BEFORE UPDATE ON terminaciones_contrato
  FOR EACH ROW
  EXECUTE FUNCTION update_terminaciones_contrato_updated_at();

-- 5) RLS (control fino se hace en API con service_role, pero dejamos políticas básicas)
ALTER TABLE terminaciones_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminacion_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Propietario gestiona terminacion" ON terminaciones_contrato;
CREATE POLICY "Propietario gestiona terminacion"
  ON terminaciones_contrato FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contratos c
      WHERE c.id = terminaciones_contrato.contrato_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contratos c
      WHERE c.id = terminaciones_contrato.contrato_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Propietario gestiona registros terminacion" ON terminacion_registros;
CREATE POLICY "Propietario gestiona registros terminacion"
  ON terminacion_registros FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM terminaciones_contrato t
      JOIN contratos c ON c.id = t.contrato_id
      WHERE t.id = terminacion_registros.terminacion_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM terminaciones_contrato t
      JOIN contratos c ON c.id = t.contrato_id
      WHERE t.id = terminacion_registros.terminacion_id
        AND c.user_id = auth.uid()
    )
  );

-- 6) Políticas de storage para la carpeta terminaciones dentro del bucket 'documentos'
DROP POLICY IF EXISTS "Ver fotos terminaciones" ON storage.objects;
CREATE POLICY "Ver fotos terminaciones"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = 'terminaciones'
  );

DROP POLICY IF EXISTS "Subir fotos terminaciones" ON storage.objects;
CREATE POLICY "Subir fotos terminaciones"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = 'terminaciones'
  );

DROP POLICY IF EXISTS "Borrar fotos terminaciones" ON storage.objects;
CREATE POLICY "Borrar fotos terminaciones"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = 'terminaciones'
  );
