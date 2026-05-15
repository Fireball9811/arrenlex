-- Evidencia de autorización (habeas data) en solicitudes de arrendamiento.
-- IF NOT EXISTS: seguro ejecutar más de una vez.

ALTER TABLE public.arrenlex_form_intake
ADD COLUMN IF NOT EXISTS autorizacion_aceptada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS autorizacion_fecha timestamp with time zone,
ADD COLUMN IF NOT EXISTS autorizacion_version text,
ADD COLUMN IF NOT EXISTS autorizacion_texto text,
ADD COLUMN IF NOT EXISTS autorizacion_ip text,
ADD COLUMN IF NOT EXISTS autorizacion_user_agent text;
