-- Crear tabla de perfiles de usuarios
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nombre TEXT,
  role TEXT NOT NULL DEFAULT 'inquilino' CHECK (role IN ('admin', 'propietario', 'inquilino')),
  activo BOOLEAN NOT NULL DEFAULT true,
  bloqueado BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear indices
CREATE INDEX IF NOT EXISTS idx_perfiles_email ON public.perfiles(email);
CREATE INDEX IF NOT EXISTS idx_perfiles_role ON public.perfiles(role);
CREATE INDEX IF NOT EXISTS idx_perfiles_activo ON public.perfiles(activo);
CREATE INDEX IF NOT EXISTS idx_perfiles_bloqueado ON public.perfiles(bloqueado);

-- Habilitar RLS
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Politicas RLS simplificadas
CREATE POLICY "Todos pueden ver perfiles"
  ON public.perfiles FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden insertar perfiles"
  ON public.perfiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Todos pueden actualizar perfiles"
  ON public.perfiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Insertar perfil inicial para admin
INSERT INTO public.perfiles (id, email, nombre, role, activo, bloqueado)
SELECT id, email, 'Administrador', 'admin', true, false
FROM auth.users
WHERE email = 'ceo@arrenlex.com'
ON CONFLICT (id) DO NOTHING;
