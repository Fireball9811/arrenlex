-- Agrupa solicitudes del mismo hogar y distingue principal vs coarrendatario.
ALTER TABLE public.arrenlex_form_intake
  ADD COLUMN IF NOT EXISTS grupo_solicitud_id text,
  ADD COLUMN IF NOT EXISTS tipo_solicitante text DEFAULT 'arrendatario_principal';

CREATE INDEX IF NOT EXISTS arrenlex_form_intake_propiedad_grupo_idx
  ON public.arrenlex_form_intake (propiedad_id, grupo_solicitud_id);
