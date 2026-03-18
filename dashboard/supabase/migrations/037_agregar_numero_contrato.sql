-- Ejecutar este SQL completo en el SQL Editor de Supabase
-- Copia y pega todo el contenido

-- 1. Agregar campo numero a la tabla contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS numero INTEGER;

-- 2. Crear secuencia para numeros de contrato
CREATE SEQUENCE IF NOT EXISTS contratos_numero_seq;

-- 3. Crear trigger para asignar numero automáticamente
CREATE OR REPLACE FUNCTION asignar_numero_contrato()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := nextval('contratos_numero_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asignar_numero_contrato ON contratos;

CREATE TRIGGER trigger_asignar_numero_contrato
  BEFORE INSERT ON contratos
  FOR EACH ROW
  EXECUTE FUNCTION asignar_numero_contrato();

-- 4. Actualizar la función obtener_datos_contrato
DROP FUNCTION IF EXISTS obtener_datos_contrato(UUID);

CREATE OR REPLACE FUNCTION obtener_datos_contrato(p_contrato_id UUID)
RETURNS TABLE(
  contrato_numero TEXT,
  arrendatario_nombre TEXT,
  arrendatario_cedula TEXT,
  arrendatario_cedula_expedicion TEXT,
  arrendatario_direccion TEXT,
  arrendatario_email TEXT,
  arrendatario_celular TEXT,
  deudor_solidario_nombre TEXT,
  deudor_solidario_cedula TEXT,
  deudor_solidario_cedula_expedicion TEXT,
  deudor_solidario_direccion TEXT,
  deudor_solidario_email TEXT,
  deudor_solidario_celular TEXT,
  propietario_nombre TEXT,
  propietario_email TEXT,
  propietario_cedula TEXT,
  propietario_cedula_expedicion TEXT,
  propietario_direccion TEXT,
  propietario_celular TEXT,
  propiedad_direccion TEXT,
  propiedad_ciudad TEXT,
  propiedad_barrio TEXT,
  propiedad_matricula TEXT,
  propiedad_cuenta_entidad TEXT,
  propiedad_cuenta_tipo TEXT,
  propiedad_cuenta_numero TEXT,
  propiedad_cuenta_titular TEXT,
  contrato_fecha_inicio DATE,
  contrato_duracion_meses INTEGER,
  contrato_fecha_fin DATE,
  contrato_canon_mensual NUMERIC,
  contrato_ciudad_firma TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Número de contrato con formato CT-0001, CT-0002, etc.
    COALESCE('CT-' || LPAD(c.numero::TEXT, 4, '0'), '') AS contrato_numero,

    -- Datos del arrendatario
    COALESCE(a.nombre, '') AS arrendatario_nombre,
    COALESCE(a.cedula, '') AS arrendatario_cedula,
    COALESCE(a.cedula_ciudad_expedicion, '') AS arrendatario_cedula_expedicion,
    COALESCE(a.direccion_residencia, prop.direccion, '') AS arrendatario_direccion,
    COALESCE(a.email, '') AS arrendatario_email,
    COALESCE(a.celular, a.telefono, '') AS arrendatario_celular,

    -- Datos del deudor solidario/coarrendatario (coarrendatario tiene prioridad)
    COALESCE(a.coarrendatario_nombre, a.deudor_solidario_nombre, 'NO APLICA') AS deudor_solidario_nombre,
    COALESCE(a.coarrendatario_cedula, a.deudor_solidario_cedula, '') AS deudor_solidario_cedula,
    COALESCE(a.coarrendatario_cedula_expedicion, a.deudor_solidario_cedula_expedicion, '') AS deudor_solidario_cedula_expedicion,
    COALESCE(a.direccion_residencia, prop.direccion, a.deudor_solidario_direccion, '') AS deudor_solidario_direccion,
    COALESCE(a.coarrendatario_email, a.deudor_solidario_email, '') AS deudor_solidario_email,
    COALESCE(a.coarrendatario_telefono, a.deudor_solidario_celular, '') AS deudor_solidario_celular,

    -- Datos del propietario (desde perfiles vía propiedad.user_id)
    COALESCE(p.nombre, '') AS propietario_nombre,
    COALESCE(p.email, '') AS propietario_email,
    COALESCE(p.cedula, '') AS propietario_cedula,
    COALESCE(p.cedula_lugar_expedicion, '') AS propietario_cedula_expedicion,
    COALESCE(p.direccion, '') AS propietario_direccion,
    COALESCE(p.celular, '') AS propietario_celular,

    -- Datos de la propiedad
    COALESCE(prop.direccion, '') AS propiedad_direccion,
    COALESCE(prop.ciudad, '') AS propiedad_ciudad,
    COALESCE(prop.barrio, '') AS propiedad_barrio,
    COALESCE(prop.matricula_inmobiliaria, '') AS propiedad_matricula,
    COALESCE(prop.cuenta_bancaria_entidad, '') AS propiedad_cuenta_entidad,
    COALESCE(prop.cuenta_bancaria_tipo, '') AS propiedad_cuenta_tipo,
    COALESCE(prop.cuenta_bancaria_numero, '') AS propiedad_cuenta_numero,
    COALESCE(prop.cuenta_bancaria_titular, '') AS propiedad_cuenta_titular,

    -- Datos del contrato
    c.fecha_inicio,
    c.duracion_meses,
    c.fecha_fin,
    c.canon_mensual,
    c.ciudad_firma
  FROM contratos c
  LEFT JOIN arrendatarios a ON c.arrendatario_id = a.id
  LEFT JOIN propiedades prop ON c.propiedad_id = prop.id
  LEFT JOIN perfiles p ON prop.user_id = p.id
  WHERE c.id = p_contrato_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION obtener_datos_contrato IS 'Retorna todos los datos necesarios para generar un contrato de arrendamiento en PDF, incluyendo número de contrato auto-numérico';
