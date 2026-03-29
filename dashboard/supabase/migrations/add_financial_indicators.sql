-- Migration: Agregar indicadores financieros a la tabla propiedades
-- Descripción: Agrega columnas para valor_inmueble, gastos_operativos, cap, grm, cuota_mensual, intereses_anuales y cash_on_cash

-- Agregar columna valor_inmueble
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS valor_inmueble NUMERIC DEFAULT NULL;

-- Agregar columna gastos_operativos
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS gastos_operativos NUMERIC DEFAULT NULL;

-- Agregar columna cap (Cap Rate)
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS cap NUMERIC DEFAULT NULL;

-- Agregar columna grm (Gross Rent Multiplier)
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS grm NUMERIC DEFAULT NULL;

-- Agregar columna cuota_mensual (cuota hipotecaria mensual)
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS cuota_mensual NUMERIC DEFAULT NULL;

-- Agregar columna intereses_anuales (tasa de interés anual del préstamo)
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS intereses_anuales NUMERIC DEFAULT NULL;

-- Agregar columna cash_on_cash (Retorno sobre capital propio invertido)
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS cash_on_cash NUMERIC DEFAULT NULL;

-- Agregar columna ber (Break-Even Rent - Arriendo de equilibrio)
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS ber NUMERIC DEFAULT NULL;

-- Comentario sobre las columnas
COMMENT ON COLUMN propiedades.valor_inmueble IS 'Valor comercial del inmueble';
COMMENT ON COLUMN propiedades.gastos_operativos IS 'Gastos operativos anuales de la propiedad (administración, impuestos, etc.)';
COMMENT ON COLUMN propiedades.cap IS 'Cap Rate: Tasa de capitalización. Se calcula como ((ingreso_anual - gastos) / valor_inmueble) * 100';
COMMENT ON COLUMN propiedades.grm IS 'GRM (Gross Rent Multiplier): Porcentaje de retorno bruto anual. Se calcula como (ingreso_anual / valor_inmueble) * 100';
COMMENT ON COLUMN propiedades.cuota_mensual IS 'Cuota mensual del préstamo hipotecario';
COMMENT ON COLUMN propiedades.intereses_anuales IS 'Tasa de interés anual del préstamo (porcentaje)';
COMMENT ON COLUMN propiedades.cash_on_cash IS 'Cash on Cash: Retorno anual sobre capital propio. Se calcula como ((ingreso_anual - gastos - cuota_anual) / valor_inmueble) * 100';
COMMENT ON COLUMN propiedades.ber IS 'BER (Break-Even Rent): Arriendo mínimo para cubrir costos. Se calcula como ((gastos_operativos / 12) + cuota_mensual)';
