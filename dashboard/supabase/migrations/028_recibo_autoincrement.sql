-- ============================================
-- Migración: Número de recibo autoincremental
-- ============================================

-- Crear una secuencia para los números de recibo
CREATE SEQUENCE IF NOT EXISTS numero_recibo_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Función para generar el número de recibo con formato: REC-YYYY-NNNN
CREATE OR REPLACE FUNCTION generar_numero_recibo()
RETURNS TEXT AS $$
DECLARE
  ano TEXT;
  numero INTEGER;
  resultado TEXT;
BEGIN
  -- Obtener el año actual
  ano := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  -- Obtener el siguiente número de la secuencia
  numero := nextval('numero_recibo_seq');

  -- Formatear como REC-YYYY-NNNN (ej: REC-2024-0001)
  resultado := 'REC-' || ano || '-' || LPAD(numero::TEXT, 4, '0');

  RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- Modificar la tabla para usar la función por defecto
ALTER TABLE recibos_pago
  ALTER COLUMN numero_recibo SET DEFAULT generar_numero_recibo();

COMMENT ON FUNCTION generar_numero_recibo() IS 'Genera un número de recibo único con formato REC-YYYY-NNNN';
