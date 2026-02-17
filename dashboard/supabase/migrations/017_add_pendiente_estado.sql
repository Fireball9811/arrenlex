-- Agregar estado 'pendiente' al CHECK constraint de propiedades
-- Este estado permite identificar propiedades que están en proceso de ser arrendadas
ALTER TABLE propiedades DROP CONSTRAINT IF EXISTS propiedades_estado_check;

ALTER TABLE propiedades
ADD CONSTRAINT propiedades_estado_check
CHECK (estado IN ('disponible', 'arrendado', 'mantenimiento', 'pendiente'));
