-- Migration 056: Posibles arrendatarios "Completados"
-- Agrega columnas para marcar un registro de intake como completado
-- (flujo cerrado exitosamente desde el panel del propietario / admin).
-- Es un estado final paralelo a "descartado" (No Aceptado) pero con
-- connotación positiva. No reemplaza gestionado, se construye sobre él.

ALTER TABLE public.arrenlex_form_intake
  ADD COLUMN IF NOT EXISTS completado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completado_at timestamptz,
  ADD COLUMN IF NOT EXISTS completado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_intake_completado
  ON public.arrenlex_form_intake (completado)
  WHERE completado = true;
