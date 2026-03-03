-- Migración 024: agregar propiedad_id (UUID FK) a arrenlex_form_intake
-- Reemplaza el uso de id_inmueble (texto libre / matricula) por una FK real al id de propiedades.
-- La columna es nullable para no romper registros históricos sin propiedad asociada.

ALTER TABLE public.arrenlex_form_intake
  ADD COLUMN IF NOT EXISTS propiedad_id UUID REFERENCES public.propiedades(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.arrenlex_form_intake.propiedad_id IS 'Propiedad a la que aplica el solicitante (FK → propiedades.id)';

CREATE INDEX IF NOT EXISTS idx_intake_propiedad_id ON public.arrenlex_form_intake(propiedad_id);
