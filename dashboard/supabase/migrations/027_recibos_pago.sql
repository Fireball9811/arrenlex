-- Migración: tabla recibos_pago para gestión de recibos de pago de arrendamiento
-- Contiene información detallada para emitir recibos de pago

-- ============================================
-- 1. CREAR TABLA RECIBOS_PAGO
-- ============================================
CREATE TABLE IF NOT EXISTS recibos_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Información de partes
  arrendador_nombre TEXT NOT NULL,
  arrendador_cedula TEXT,
  propietario_nombre TEXT NOT NULL,
  propietario_cedula TEXT,
  
  -- Valores del arriendo
  valor_arriendo NUMERIC NOT NULL,
  valor_arriendo_letras TEXT NOT NULL,
  
  -- Período del pago
  fecha_inicio_periodo DATE NOT NULL,
  fecha_fin_periodo DATE NOT NULL,
  
  -- Tipo de pago
  tipo_pago TEXT NOT NULL DEFAULT 'arriendo' CHECK (tipo_pago IN ('arriendo', 'servicios', 'otro')),
  
  -- Información del recibo
  fecha_recibo DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_recibo TEXT UNIQUE,
  
  -- Cuenta de consignación
  cuenta_consignacion TEXT,
  referencia_pago TEXT,
  
  -- Notas
  nota TEXT,
  
  -- Estado
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'emitido', 'cancelado')),
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE recibos_pago IS 'Recibos de pago de arrendamiento para propiedades';
COMMENT ON COLUMN recibos_pago.propiedad_id IS 'ID de la propiedad del cual se está generando el recibo';
COMMENT ON COLUMN recibos_pago.user_id IS 'ID del propietario que genera el recibo';
COMMENT ON COLUMN recibos_pago.valor_arriendo_letras IS 'Valor del arriendo en letras (ej: Cien Mil Pesos)';
COMMENT ON COLUMN recibos_pago.tipo_pago IS 'Tipo de pago: arriendo, servicios u otro';
COMMENT ON COLUMN recibos_pago.fecha_recibo IS 'Fecha en que se emite el recibo (por defecto, hoy)';
COMMENT ON COLUMN recibos_pago.numero_recibo IS 'Número secuencial del recibo (opcional, auto-generado)';
COMMENT ON COLUMN recibos_pago.nota IS 'Notas adicionales que el propietario quiera incluir en el recibo';

-- ============================================
-- 2. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_recibos_pago_propiedad_id ON recibos_pago(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_recibos_pago_user_id ON recibos_pago(user_id);
CREATE INDEX IF NOT EXISTS idx_recibos_pago_estado ON recibos_pago(estado);
CREATE INDEX IF NOT EXISTS idx_recibos_pago_fecha_recibo ON recibos_pago(fecha_recibo);
CREATE INDEX IF NOT EXISTS idx_recibos_pago_tipo_pago ON recibos_pago(tipo_pago);

-- ============================================
-- 3. TRIGGER UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_recibos_pago_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recibos_pago_updated_at ON recibos_pago;
CREATE TRIGGER trigger_recibos_pago_updated_at
  BEFORE UPDATE ON recibos_pago
  FOR EACH ROW
  EXECUTE FUNCTION update_recibos_pago_updated_at();

-- ============================================
-- 4. RLS (Row Level Security)
-- ============================================
ALTER TABLE recibos_pago ENABLE ROW LEVEL SECURITY;

-- Los propietarios solo pueden ver/editar sus propios recibos
CREATE POLICY recibos_pago_propietario_policy ON recibos_pago
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Los admins pueden ver todos
CREATE POLICY recibos_pago_admin_policy ON recibos_pago
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin'
    )
  );
