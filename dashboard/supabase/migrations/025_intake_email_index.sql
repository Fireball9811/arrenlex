-- Índice en arrenlex_form_intake(email) para búsquedas rápidas al verificar duplicados
CREATE INDEX IF NOT EXISTS idx_intake_email ON public.arrenlex_form_intake(email);
