-- ============================================================================
-- CAMPO DE PORCENTAJE DE GARANTÍA EN CONTRATOS
-- Permite que cada contrato tenga un porcentaje de garantía personalizado
-- Por defecto 50% (0.5), sin límites máximos
-- ============================================================================

-- Agregar campo de porcentaje de garantía
ALTER TABLE contratos
ADD COLUMN porcentaje_garantia NUMERIC DEFAULT 0.5 NOT NULL;

-- Comentario explicativo
COMMENT ON COLUMN contratos.porcentaje_garantia IS 'Porcentaje del canon mensual destinado a garantía (0.5=50% por defecto). Ej: 0.5=50%, 1.0=100%, 2.0=200%. Sin límite máximo.';

-- Crear índice para búsquedas frecuentes por rango de garantía
CREATE INDEX IF NOT EXISTS idx_contratos_porcentaje_garantia ON contratos(porcentaje_garantia);
