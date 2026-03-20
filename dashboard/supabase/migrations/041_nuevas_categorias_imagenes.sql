-- Migración para agregar nuevas categorías de imágenes de propiedades
-- Categorías nuevas: principal, comedor, parqueadero, deposito

-- Eliminar el constraint existente y reemplazarlo con uno que incluya las nuevas categorías
ALTER TABLE propiedades_imagenes
  DROP CONSTRAINT IF EXISTS propiedades_imagenes_categoria_check;

ALTER TABLE propiedades_imagenes
  ADD CONSTRAINT propiedades_imagenes_categoria_check
  CHECK (categoria IN (
    'principal',
    'sala',
    'comedor',
    'cocina',
    'habitacion',
    'bano',
    'parqueadero',
    'deposito',
    'fachada',
    'otra'
  ));

-- Actualizar comentario de columna
COMMENT ON COLUMN propiedades_imagenes.categoria IS 'Categoria de la imagen: principal, sala, comedor, cocina, habitacion, bano, parqueadero, deposito, fachada, otra';
