-- Migration 055: Agregar fecha deseada de ingreso al inmueble en arrenlex_form_intake
--
-- Contexto:
--   El formulario público de aplicación ahora pregunta al inquilino la fecha
--   en la que desea pasarse al inmueble (día / mes / año). Esto permite al
--   propietario ver, en el detalle del mensaje, si el aplicante quiere ocupar
--   el inmueble en menos de 5 días hábiles desde la fecha de envío, lo cual
--   se resalta como una nota informativa.

ALTER TABLE public.arrenlex_form_intake
  ADD COLUMN IF NOT EXISTS fecha_ingreso_deseada DATE;

COMMENT ON COLUMN public.arrenlex_form_intake.fecha_ingreso_deseada IS
  'Fecha (DATE) en la que el aplicante desea pasarse/ocupar el inmueble. Se captura en el formulario público de aplicación.';
