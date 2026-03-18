-- Actualizar la función obtener_datos_contrato para incluir numero de contrato
-- Esta migracion agrega el numero de contrato y corrige las direcciones

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
DECLARE
  v_year TEXT;
  v_seq TEXT;
BEGIN
  -- Obtener el año actual para el numero de contrato
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  -- Buscar cuantos contratos existen este año para generar consecutivo
  SELECT COUNT(*)::TEXT INTO v_seq
  FROM contratos
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);

  RETURN QUERY
  SELECT
    -- Numero de contrato (formato: 001-2024)
    LPAD(COALESCE(v_seq, '0'), 3, '0') || '-' || v_year AS contrato_numero,

    -- Arrendatario principal
    COALESCE(a.nombre, '') AS arrendatario_nombre,
    COALESCE(a.cedula, '') AS arrendatario_cedula,
    COALESCE(a.cedula_ciudad_expedicion, '') AS arrendatario_cedula_expedicion,
    COALESCE(a.direccion_residencia, '') AS arrendatario_direccion,
    COALESCE(a.email, '') AS arrendatario_email,
    COALESCE(a.celular, '') AS arrendatario_celular,

    -- Coarrendatario
    COALESCE(a.coarrendatario_nombre, a.deudor_solidario_nombre, 'NO APLICA') AS deudor_solidario_nombre,
    COALESCE(a.coarrendatario_cedula, a.deudor_solidario_cedula, '') AS deudor_solidario_cedula,
    COALESCE(a.deudor_solidario_cedula_expedicion, '') AS deudor_solidario_cedula_expedicion,
    COALESCE(a.deudor_solidario_direccion, '') AS deudor_solidario_direccion,
    COALESCE(a.coarrendatario_email, a.deudor_solidario_email, '') AS deudor_solidario_email,
    COALESCE(a.deudor_solidario_celular, '') AS deudor_solidario_celular,

    -- Propietario (desde perfiles)
    COALESCE(p.nombre, '') AS propietario_nombre,
    COALESCE(p.email, '') AS propietario_email,
    COALESCE(p.cedula, '') AS propietario_cedula,
    COALESCE(p.cedula_lugar_expedicion, '') AS propietario_cedula_expedicion,
    COALESCE(p.direccion, '') AS propietario_direccion,
    COALESCE(p.celular, '') AS propietario_celular,

    -- Propiedad
    COALESCE(prop.direccion, '') AS propiedad_direccion,
    COALESCE(prop.ciudad, '') AS propiedad_ciudad,
    COALESCE(prop.barrio, '') AS propiedad_barrio,
    COALESCE(prop.matricula_inmobiliaria, '') AS propiedad_matricula,
    COALESCE(prop.cuenta_bancaria_entidad, '') AS propiedad_cuenta_entidad,
    COALESCE(prop.cuenta_bancaria_tipo, '') AS propiedad_cuenta_tipo,
    COALESCE(prop.cuenta_bancaria_numero, '') AS propiedad_cuenta_numero,
    COALESCE(prop.cuenta_bancaria_titular, '') AS propiedad_cuenta_titular,

    -- Contrato
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

COMMENT ON FUNCTION obtener_datos_contrato IS 'Retorna todos los datos necesarios para generar un contrato, incluyendo numero de contrato consecutivo por año';
