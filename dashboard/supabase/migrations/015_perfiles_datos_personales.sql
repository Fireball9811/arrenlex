-- Añadir datos personales a perfiles: celular, cédula, lugar expedición, dirección
-- Permite mostrar y editar nombre completo, celular, cédula de ciudadanía, etc.

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS celular TEXT,
  ADD COLUMN IF NOT EXISTS cedula TEXT,
  ADD COLUMN IF NOT EXISTS cedula_lugar_expedicion TEXT,
  ADD COLUMN IF NOT EXISTS direccion TEXT;

COMMENT ON COLUMN public.perfiles.celular IS 'Número celular del usuario';
COMMENT ON COLUMN public.perfiles.cedula IS 'Cédula de ciudadanía';
COMMENT ON COLUMN public.perfiles.cedula_lugar_expedicion IS 'Lugar de expedición de la cédula';
COMMENT ON COLUMN public.perfiles.direccion IS 'Dirección de vivienda';
