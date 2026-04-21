-- Migration 052: Descartar posibles arrendatarios (estado No Aceptado)
-- Agrega columnas para marcar un registro de intake como rechazado,
-- con motivo, fecha y usuario que lo descartó. Incluye índice parcial
-- sobre la cédula de los registros descartados para consultas rápidas
-- de reincidencia (misma cédula aplica nuevamente luego de un rechazo).

ALTER TABLE public.arrenlex_form_intake
  ADD COLUMN IF NOT EXISTS descartado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_descarte text,
  ADD COLUMN IF NOT EXISTS descartado_at timestamptz,
  ADD COLUMN IF NOT EXISTS descartado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_intake_cedula_descartado
  ON public.arrenlex_form_intake (cedula)
  WHERE cedula IS NOT NULL AND descartado = true;
