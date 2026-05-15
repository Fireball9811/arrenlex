-- Pareja de enlaces de aplicación: mismo grupo, distinto tipo_solicitante por token.
ALTER TABLE public.aplicacion_tokens
  ADD COLUMN IF NOT EXISTS grupo_solicitud_id text,
  ADD COLUMN IF NOT EXISTS tipo_solicitante text NOT NULL DEFAULT 'arrendatario_principal';

CREATE INDEX IF NOT EXISTS aplicacion_tokens_grupo_propiedad_idx
  ON public.aplicacion_tokens (propiedad_id, grupo_solicitud_id)
  WHERE grupo_solicitud_id IS NOT NULL;
