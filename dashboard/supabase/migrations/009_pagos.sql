-- Migración: tabla pagos para gestión de pagos de arrendamiento
-- Relaciona cada pago con un contrato (propiedad + arrendatario + canon)

-- ============================================
-- 1. CREAR TABLA PAGOS
-- ============================================
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,

  monto NUMERIC NOT NULL,
  periodo TEXT NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'Transferencia',
  referencia_bancaria TEXT,

  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'rechazado')),
  fecha_pago DATE,
  fecha_aprobacion TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pagos IS 'Pagos de arrendamiento registrados por contrato';
COMMENT ON COLUMN pagos.contrato_id IS 'Contrato al que pertenece el pago';
COMMENT ON COLUMN pagos.periodo IS 'Periodo del pago en formato YYYY-MM (ej. 2026-01)';
COMMENT ON COLUMN pagos.referencia_bancaria IS 'Referencia bancaria completa (números y letras)';

-- ============================================
-- 2. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pagos_contrato_id ON pagos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_periodo ON pagos(periodo);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha_pago ON pagos(fecha_pago);

-- ============================================
-- 3. TRIGGER UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_pagos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pagos_updated_at ON pagos;
CREATE TRIGGER trigger_pagos_updated_at
  BEFORE UPDATE ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION update_pagos_updated_at();

-- ============================================
-- 4. RLS Y POLÍTICAS
-- ============================================
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Ver pagos: propietario (sus contratos) o admin (todos)
CREATE POLICY "Ver pagos propietario o admin"
  ON pagos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contratos c
      WHERE c.id = pagos.contrato_id AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM perfiles pf
      WHERE pf.id = auth.uid() AND pf.role = 'admin'
    )
  );

-- Insertar: propietario (sus contratos) o admin
CREATE POLICY "Insertar pagos propietario o admin"
  ON pagos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contratos c
      WHERE c.id = pagos.contrato_id AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM perfiles pf
      WHERE pf.id = auth.uid() AND pf.role = 'admin'
    )
  );

-- Actualizar: propietario (sus contratos) o admin
CREATE POLICY "Actualizar pagos propietario o admin"
  ON pagos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contratos c
      WHERE c.id = pagos.contrato_id AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM perfiles pf
      WHERE pf.id = auth.uid() AND pf.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contratos c
      WHERE c.id = pagos.contrato_id AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM perfiles pf
      WHERE pf.id = auth.uid() AND pf.role = 'admin'
    )
  );
