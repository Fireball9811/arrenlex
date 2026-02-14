-- Verificar estructura actual de la tabla perfiles
-- Ejecutar primero para ver qué columnas existen

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'perfiles'
ORDER BY ordinal_position;
