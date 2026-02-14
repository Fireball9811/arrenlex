-- Migración para soportar generación de contratos
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. AGREGAR COLUMNAS A PROPIEDADES
-- ============================================
ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS matricula_inmobiliaria TEXT,
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_entidad TEXT,
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_tipo TEXT,
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_numero TEXT,
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_titular TEXT;

-- Comentario para documentar
COMMENT ON COLUMN propiedades.matricula_inmobiliaria IS 'Matrícula inmobiliaria del inmueble';
COMMENT ON COLUMN propiedades.cuenta_bancaria_entidad IS 'Entidad bancaria para recibir pagos';
COMMENT ON COLUMN propiedades.cuenta_bancaria_tipo IS 'Tipo de cuenta (ahorros, corriente)';
COMMENT ON COLUMN propiedades.cuenta_bancaria_numero IS 'Número de cuenta bancaria';
COMMENT ON COLUMN propiedades.cuenta_bancaria_titular IS 'Titular de la cuenta bancaria';

-- ============================================
-- 2. AGREGAR COLUMNAS A ARRENDATARIOS
-- ============================================
ALTER TABLE arrendatarios
  ADD COLUMN IF NOT EXISTS cedula_ciudad_expedicion TEXT,
  ADD COLUMN IF NOT EXISTS direccion_residencia TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS celular TEXT,
  ADD COLUMN IF NOT EXISTS deudor_solidario_nombre TEXT,
  ADD COLUMN IF NOT EXISTS deudor_solidario_cedula TEXT,
  ADD COLUMN IF NOT EXISTS deudor_solidario_cedula_expedicion TEXT,
  ADD COLUMN IF NOT EXISTS deudor_solidario_direccion TEXT,
  ADD COLUMN IF NOT EXISTS deudor_solidario_email TEXT,
  ADD COLUMN IF NOT EXISTS deudor_solidario_celular TEXT;

-- Comentarios para documentar
COMMENT ON COLUMN arrendatarios.cedula_ciudad_expedicion IS 'Ciudad de expedición de la cédula';
COMMENT ON COLUMN arrendatarios.direccion_residencia IS 'Dirección de residencia actual';
COMMENT ON COLUMN arrendatarios.email IS 'Correo electrónico de contacto';
COMMENT ON COLUMN arrendatarios.celular IS 'Número de celular';
COMMENT ON COLUMN arrendatarios.deudor_solidario_nombre IS 'Nombre completo del deudor solidario';
COMMENT ON COLUMN arrendatarios.deudor_solidario_cedula IS 'Cédula del deudor solidario';
COMMENT ON COLUMN arrendatarios.deudor_solidario_cedula_expedicion IS 'Ciudad de expedición cédula del deudor solidario';
COMMENT ON COLUMN arrendatarios.deudor_solidario_direccion IS 'Dirección del deudor solidario';
COMMENT ON COLUMN arrendatarios.deudor_solidario_email IS 'Email del deudor solidario';
COMMENT ON COLUMN arrendatarios.deudor_solidario_celular IS 'Celular del deudor solidario';

-- ============================================
-- 3. CREAR TABLA CONTRATOS
-- ============================================
CREATE TABLE IF NOT EXISTS contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  arrendatario_id UUID NOT NULL REFERENCES arrendatarios(id) ON DELETE CASCADE,

  -- Fechas del contrato
  fecha_inicio DATE NOT NULL,
  duracion_meses INTEGER NOT NULL DEFAULT 12,
  fecha_fin DATE GENERATED ALWAYS AS (fecha_inicio + (duracion_meses * make_interval(months => 1))) STORED,

  -- Datos del contrato
  canon_mensual NUMERIC NOT NULL,
  ciudad_firma TEXT NOT NULL,

  -- Estado del contrato
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'activo', 'terminado', 'vencido')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentarios para documentar
COMMENT ON TABLE contratos IS 'Contratos de arrendamiento entre propiedades y arrendatarios';
COMMENT ON COLUMN contratos.propiedad_id IS 'ID de la propiedad arrendada';
COMMENT ON COLUMN contratos.arrendatario_id IS 'ID del arrendatario';
COMMENT ON COLUMN contratos.fecha_inicio IS 'Fecha de inicio del contrato';
COMMENT ON COLUMN contratos.duracion_meses IS 'Duración en meses (por defecto 12)';
COMMENT ON COLUMN contratos.fecha_fin IS 'Fecha de término del contrato (calculada)';
COMMENT ON COLUMN contratos.canon_mensual IS 'Valor mensual del canon de arrendamiento';
COMMENT ON COLUMN contratos.ciudad_firma IS 'Ciudad donde se firma el contrato';
COMMENT ON COLUMN contratos.estado IS 'Estado: borrador, activo, terminado, vencido';

-- ============================================
-- 4. ÍNDICES PARA RENDIMIENTO
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contratos_user_id ON contratos(user_id);
CREATE INDEX IF NOT EXISTS idx_contratos_propiedad_id ON contratos(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_contratos_arrendatario_id ON contratos(arrendatario_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado ON contratos(estado);
CREATE INDEX IF NOT EXISTS idx_contratos_fecha_inicio ON contratos(fecha_inicio);

-- ============================================
-- 5. TRIGGER PARA UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_contratos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contratos_updated_at ON contratos;

CREATE TRIGGER trigger_contratos_updated_at
  BEFORE UPDATE ON contratos
  FOR EACH ROW
  EXECUTE FUNCTION update_contratos_updated_at();

-- ============================================
-- 6. HABILITAR RLS Y POLÍTICAS
-- ============================================
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus contratos
CREATE POLICY "Usuarios pueden ver sus contratos"
  ON contratos FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios pueden insertar contratos
CREATE POLICY "Usuarios pueden insertar contratos"
  ON contratos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden actualizar sus contratos
CREATE POLICY "Usuarios pueden actualizar sus contratos"
  ON contratos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden eliminar sus contratos
CREATE POLICY "Usuarios pueden eliminar sus contratos"
  ON contratos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. FUNCIÓN PARA OBTENER DATOS DEL CONTRATO
-- ============================================
CREATE OR REPLACE FUNCTION obtener_datos_contrato(p_contrato_id UUID)
RETURNS TABLE(
  -- Datos del arrendatario
  arrendatario_nombre TEXT,
  arrendatario_cedula TEXT,
  arrendatario_cedula_expedicion TEXT,
  arrendatario_direccion TEXT,
  arrendatario_email TEXT,
  arrendatario_celular TEXT,

  -- Datos del deudor solidario
  deudor_solidario_nombre TEXT,
  deudor_solidario_cedula TEXT,
  deudor_solidario_cedula_expedicion TEXT,
  deudor_solidario_direccion TEXT,
  deudor_solidario_email TEXT,
  deudor_solidario_celular TEXT,

  -- Datos del propietario/arrendador
  propietario_nombre TEXT,
  propietario_email TEXT,
  propietario_cedula TEXT,

  -- Datos de la propiedad
  propiedad_direccion TEXT,
  propiedad_ciudad TEXT,
  propiedad_barrio TEXT,
  propiedad_matricula TEXT,
  propiedad_cuenta_entidad TEXT,
  propiedad_cuenta_tipo TEXT,
  propiedad_cuenta_numero TEXT,
  propiedad_cuenta_titular TEXT,

  -- Datos del contrato
  contrato_fecha_inicio DATE,
  contrato_duracion_meses INTEGER,
  contrato_fecha_fin DATE,
  contrato_canon_mensual NUMERIC,
  contrato_ciudad_firma TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Arrendatario
    a.nombre,
    a.cedula,
    a.cedula_ciudad_expedicion,
    a.direccion_residencia,
    a.email,
    a.celular,

    -- Deudor solidario
    a.deudor_solidario_nombre,
    a.deudor_solidario_cedula,
    a.deudor_solidario_cedula_expedicion,
    a.deudor_solidario_direccion,
    a.deudor_solidario_email,
    a.deudor_solidario_celular,

    -- Propietario
    p.nombre,
    p.email,
    NULL::TEXT, -- Cédula del propietario (no está en perfiles)

    -- Propiedad
    prop.direccion,
    prop.ciudad,
    prop.barrio,
    prop.matricula_inmobiliaria,
    prop.cuenta_bancaria_entidad,
    prop.cuenta_bancaria_tipo,
    prop.cuenta_bancaria_numero,
    prop.cuenta_bancaria_titular,

    -- Contrato
    c.fecha_inicio,
    c.duracion_meses,
    c.fecha_fin,
    c.canon_mensual,
    c.ciudad_firma
  FROM contratos c
  JOIN arrendatarios a ON c.arrendatario_id = a.id
  JOIN propiedades prop ON c.propiedad_id = prop.id
  JOIN perfiles p ON prop.user_id = p.id
  WHERE c.id = p_contrato_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION obtener_datos_contrato IS 'Retorna todos los datos necesarios para generar un contrato';
