-- Migración 034: Agregar características adicionales a propiedades
-- Agrega campos para ascensor, depósitos y parqueaderos

-- ============================================
-- 1. AGREGAR NUEVAS COLUMNAS A propiedades
-- ============================================
ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS ascensor INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS depositos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parqueaderos INTEGER DEFAULT 0;

-- ============================================
-- 2. COMENTARIOS PARA DOCUMENTAR
-- ============================================
COMMENT ON COLUMN propiedades.ascensor IS 'Cantidad de ascensores en el edificio (0 = no tiene)';
COMMENT ON COLUMN propiedades.depositos IS 'Cantidad de depósitos o unidades de almacenamiento';
COMMENT ON COLUMN propiedades.parqueaderos IS 'Cantidad de parqueaderos disponibles';

-- ============================================
-- 3. ÍNDICES PARA FILTRADO
-- ============================================
CREATE INDEX IF NOT EXISTS idx_propiedades_ascensor ON propiedades(ascensor)
  WHERE ascensor > 0;

CREATE INDEX IF NOT EXISTS idx_propiedades_parqueaderos ON propiedades(parqueaderos)
  WHERE parqueaderos > 0;
