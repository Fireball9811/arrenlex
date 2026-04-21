-- Migration 053: Agregar columna coarrendatario_email a arrenlex_form_intake
--
-- Contexto:
--   El endpoint POST /api/intake/aplicacion intenta insertar el correo del
--   coarrendatario en la columna `coarrendatario_email` de
--   `arrenlex_form_intake`, pero esa columna nunca fue creada para esta tabla
--   (la migración 030 solo la añadió a la tabla `arrendatarios`).
--
--   Esto provocaba que todas las solicitudes del wizard público fallaran con
--   el error Postgres 42703 ("undefined_column"), que el endpoint reportaba
--   como status 500 "Error al guardar la solicitud".
--
--   Esta migración crea la columna para que el INSERT funcione y el valor
--   del formulario se persista junto al resto de datos del coarrendatario.

ALTER TABLE public.arrenlex_form_intake
  ADD COLUMN IF NOT EXISTS coarrendatario_email TEXT;

COMMENT ON COLUMN public.arrenlex_form_intake.coarrendatario_email IS
  'Correo electrónico del coarrendatario capturado en el formulario público de aplicación de arrendamiento.';

-- Índice parcial para búsquedas/ reincidencia por email del coarrendatario.
-- Se restringe a valores no nulos para mantenerlo pequeño.
CREATE INDEX IF NOT EXISTS idx_intake_coarrendatario_email
  ON public.arrenlex_form_intake (coarrendatario_email)
  WHERE coarrendatario_email IS NOT NULL;
