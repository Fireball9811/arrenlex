-- Tabla para tokens de aplicación de un solo uso con expiración de 24 horas.
-- Cada token corresponde a un enlace único enviado a un solicitante potencial
-- para una propiedad específica. El enlace expira tras 24 horas o al ser usado.

CREATE TABLE IF NOT EXISTS public.aplicacion_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  propiedad_id UUID NOT NULL REFERENCES public.propiedades(id) ON DELETE CASCADE,
  usado BOOLEAN NOT NULL DEFAULT false,
  usado_en TIMESTAMP WITH TIME ZONE,
  intake_id UUID REFERENCES public.arrenlex_form_intake(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expira_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 day')
);

CREATE INDEX IF NOT EXISTS aplicacion_tokens_token_idx ON public.aplicacion_tokens(token);
CREATE INDEX IF NOT EXISTS aplicacion_tokens_propiedad_idx ON public.aplicacion_tokens(propiedad_id);

ALTER TABLE public.aplicacion_tokens ENABLE ROW LEVEL SECURITY;
-- Sin políticas explícitas: solo service_role (createAdminClient) puede acceder.
