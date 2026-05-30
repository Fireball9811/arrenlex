-- Auditoría de respuestas Habeas Data (envío / guardado)

ALTER TABLE public.arrenlex_habeas_data_requests
  ADD COLUMN IF NOT EXISTS respuesta_asunto text;

ALTER TABLE public.arrenlex_habeas_data_requests
  ADD COLUMN IF NOT EXISTS respondido_por uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.arrenlex_habeas_data_requests
  ADD COLUMN IF NOT EXISTS respuesta_enviada boolean NOT NULL DEFAULT false;

ALTER TABLE public.arrenlex_habeas_data_requests
  ADD COLUMN IF NOT EXISTS respuesta_error text;

COMMENT ON COLUMN public.arrenlex_habeas_data_requests.respuesta_asunto IS 'Asunto del correo de respuesta enviado o preparado';
COMMENT ON COLUMN public.arrenlex_habeas_data_requests.respondido_por IS 'Usuario autenticado que envió o guardó la respuesta';
COMMENT ON COLUMN public.arrenlex_habeas_data_requests.respuesta_enviada IS 'true si el correo se envió por el proveedor; false si fue guardado manual/fallback';
COMMENT ON COLUMN public.arrenlex_habeas_data_requests.respuesta_error IS 'Mensaje de error de envío o nota de envío manual';
