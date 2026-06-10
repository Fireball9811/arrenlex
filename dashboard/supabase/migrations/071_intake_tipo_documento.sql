-- Agrega tipo de documento al intake público de aplicaciones
ALTER TABLE public.arrenlex_form_intake
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT;

COMMENT ON COLUMN public.arrenlex_form_intake.tipo_documento IS
  'Tipo de documento del solicitante (CC, CE, INT, NIT, PP, PPT).';

-- Backfill para registros históricos que no tenían el campo
UPDATE public.arrenlex_form_intake
SET tipo_documento = COALESCE(NULLIF(tipo_documento, ''), 'CC')
WHERE tipo_documento IS NULL OR tipo_documento = '';

-- Restricción de dominio para nuevos datos
ALTER TABLE public.arrenlex_form_intake
  DROP CONSTRAINT IF EXISTS arrenlex_form_intake_tipo_documento_check;

ALTER TABLE public.arrenlex_form_intake
  ADD CONSTRAINT arrenlex_form_intake_tipo_documento_check
  CHECK (tipo_documento IN ('CC', 'CE', 'INT', 'NIT', 'PP', 'PPT'));
