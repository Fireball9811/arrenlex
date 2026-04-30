-- Migración: tabla otros_gastos para gestión de pagos diversos a proveedores
-- Permite registrar pagos a terceros por servicios diversos, generar recibos y llevar contabilidad

-- ============================================
-- 1. SECUENCIA PARA NÚMERO DE RECIBO
-- ============================================
CREATE SEQUENCE IF NOT EXISTS seq_otros_gastos_recibo
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- ============================================
-- 2. CREAR TABLA otros_gastos
-- ============================================
CREATE TABLE IF NOT EXISTS otros_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Información del proveedor/persona que recibe el pago
  nombre_completo TEXT NOT NULL,
  cedula TEXT NOT NULL,
  tarjeta_profesional TEXT,
  correo_electronico TEXT,

  -- Detalle del pago
  motivo_pago TEXT NOT NULL,
  descripcion_trabajo TEXT NOT NULL,
  fecha_realizacion DATE NOT NULL DEFAULT CURRENT_DATE,
  valor NUMERIC NOT NULL,

  -- Información bancaria
  banco TEXT,
  referencia_pago TEXT,

  -- Recibo
  numero_recibo TEXT UNIQUE DEFAULT ('OG-' || LPAD(nextval('seq_otros_gastos_recibo')::TEXT, 6, '0')),
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Estado
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'emitido', 'cancelado')),

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE otros_gastos IS 'Registro de pagos diversos a proveedores/trabajadores por servicios varios';
COMMENT ON COLUMN otros_gastos.propiedad_id IS 'Propiedad a la que se asocia el gasto';
COMMENT ON COLUMN otros_gastos.user_id IS 'Usuario (propietario) que registra el gasto';
COMMENT ON COLUMN otros_gastos.nombre_completo IS 'Nombre completo de la persona a la que se le paga';
COMMENT ON COLUMN otros_gastos.cedula IS 'Cédula de la persona que recibe el pago';
COMMENT ON COLUMN otros_gastos.tarjeta_profesional IS 'Tarjeta profesional (opcional, para oficios que la requieren)';
COMMENT ON COLUMN otros_gastos.correo_electronico IS 'Correo electrónico para enviar el recibo';
COMMENT ON COLUMN otros_gastos.motivo_pago IS 'Motivo general del pago (ej: plomería, electricidad, limpieza)';
COMMENT ON COLUMN otros_gastos.descripcion_trabajo IS 'Descripción detallada del trabajo realizado';
COMMENT ON COLUMN otros_gastos.fecha_realizacion IS 'Fecha en que se realizó el trabajo';
COMMENT ON COLUMN otros_gastos.valor IS 'Valor del pago en COP';
COMMENT ON COLUMN otros_gastos.banco IS 'Banco donde se consignó el pago';
COMMENT ON COLUMN otros_gastos.referencia_pago IS 'Referencia de la transacción bancaria';
COMMENT ON COLUMN otros_gastos.numero_recibo IS 'Número único del recibo (auto-generado)';
COMMENT ON COLUMN otros_gastos.fecha_emision IS 'Fecha de emisión del recibo';
COMMENT ON COLUMN otros_gastos.estado IS 'Estado del recibo: pendiente, emitido, cancelado';

-- ============================================
-- 3. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_otros_gastos_propiedad_id ON otros_gastos(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_otros_gastos_user_id ON otros_gastos(user_id);
CREATE INDEX IF NOT EXISTS idx_otros_gastos_estado ON otros_gastos(estado);
CREATE INDEX IF NOT EXISTS idx_otros_gastos_fecha_emision ON otros_gastos(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_otros_gastos_numero_recibo ON otros_gastos(numero_recibo);
CREATE INDEX IF NOT EXISTS idx_otros_gastos_cedula ON otros_gastos(cedula);
CREATE INDEX IF NOT EXISTS idx_otros_gastos_nombre_completo ON otros_gastos(nombre_completo);

-- ============================================
-- 4. TRIGGER UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_otros_gastos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_otros_gastos_updated_at ON otros_gastos;
CREATE TRIGGER trigger_otros_gastos_updated_at
  BEFORE UPDATE ON otros_gastos
  FOR EACH ROW
  EXECUTE FUNCTION update_otros_gastos_updated_at();

-- ============================================
-- 5. RLS (Row Level Security)
-- ============================================
ALTER TABLE otros_gastos ENABLE ROW LEVEL SECURITY;

-- Eliminar policies si existen
DROP POLICY IF EXISTS otros_gastos_propietario_policy ON otros_gastos;
DROP POLICY IF EXISTS otros_gastos_admin_policy ON otros_gastos;

-- Los propietarios solo pueden ver/editar sus propios registros
CREATE POLICY otros_gastos_propietario_policy ON otros_gastos
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Los admins pueden ver todos
CREATE POLICY otros_gastos_admin_policy ON otros_gastos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin'
    )
  );
