-- Permitir que usuarios anónimos (landing sin login) puedan llamar la función
-- que lista ciudades con propiedades disponibles (para el dropdown de la página de inicio).
GRANT EXECUTE ON FUNCTION obtener_ciudades_disponibles() TO anon;
