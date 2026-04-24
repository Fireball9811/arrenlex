-- Migración: agregar categoría 'mapa' a propiedades_imagenes
-- Permite que cada propiedad tenga una captura de mapa (Google Maps u otro)
-- subida por el propietario, que se mostrará en el catálogo público.

ALTER TABLE propiedades_imagenes
  DROP CONSTRAINT IF EXISTS propiedades_imagenes_categoria_check;

ALTER TABLE propiedades_imagenes
  ADD CONSTRAINT propiedades_imagenes_categoria_check
  CHECK (categoria IN (
    'principal',
    'sala',
    'sala_estar',
    'comedor',
    'cocina',
    'habitacion',
    'bano',
    'zona_lavado',
    'parqueadero',
    'deposito',
    'fachada',
    'mapa',
    'otra'
  ));

COMMENT ON COLUMN propiedades_imagenes.categoria IS
  'Categoria de la imagen: principal, sala, sala_estar, comedor, cocina, habitacion, bano, zona_lavado, parqueadero, deposito, fachada, mapa, otra';
