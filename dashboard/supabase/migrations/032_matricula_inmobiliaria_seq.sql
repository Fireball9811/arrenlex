-- Crear secuencia para matrícula inmobiliaria automática
CREATE SEQUENCE IF NOT EXISTS matricula_inmobiliaria_seq START 1;

-- Agregar columna numero_matricula a propiedades
ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS numero_matricula TEXT DEFAULT '';

-- Crear índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_propiedades_numero_matricula
  ON propiedades(numero_matricula)
  WHERE numero_matricula IS NOT NULL AND numero_matricula != '';

-- Función para generar el siguiente número de matrícula con formato 000000
CREATE OR REPLACE FUNCTION generar_numero_matricula()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  matricula_text TEXT;
BEGIN
  SELECT nextval('matricula_inmobiliaria_seq') INTO next_num;
  matricula_text := LPAD(next_num::TEXT, 6, '0');
  RETURN matricula_text;
END;
$$ LANGUAGE plpgsql;
