-- Módulo interno Habeas Data: solicitudes de tratamiento de datos personales
-- Visible solo para admin y propietario vía aplicación (API con service role + middleware).

CREATE TABLE IF NOT EXISTS public.arrenlex_habeas_data_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_recibido timestamp with time zone DEFAULT now(),
    nombre text,
    cedula text,
    email text,
    telefono text,
    tipo_solicitud text,
    descripcion text,
    estado text DEFAULT 'recibido',
    fecha_limite_respuesta timestamp with time zone,
    fecha_respuesta timestamp with time zone,
    respuesta text,
    origen text DEFAULT 'correo',
    relacionado_form_intake_id uuid REFERENCES public.arrenlex_form_intake (id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habeas_data_fecha_recibido
  ON public.arrenlex_habeas_data_requests (fecha_recibido DESC);

CREATE INDEX IF NOT EXISTS idx_habeas_data_estado
  ON public.arrenlex_habeas_data_requests (estado);

CREATE INDEX IF NOT EXISTS idx_habeas_data_tipo_solicitud
  ON public.arrenlex_habeas_data_requests (tipo_solicitud);

CREATE INDEX IF NOT EXISTS idx_habeas_data_intake
  ON public.arrenlex_habeas_data_requests (relacionado_form_intake_id);

-- Función reutilizable updated_at (nombre acordado con el proyecto)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_arrenlex_habeas_data_requests_updated_at
ON public.arrenlex_habeas_data_requests;

CREATE TRIGGER trg_arrenlex_habeas_data_requests_updated_at
BEFORE UPDATE ON public.arrenlex_habeas_data_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS: sin políticas para roles JWT; el acceso es vía rutas API con service_role.
ALTER TABLE public.arrenlex_habeas_data_requests ENABLE ROW LEVEL SECURITY;
