-- Crear tabla de perfiles de usuarios
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nombre TEXT,
  role TEXT NOT NULL DEFAULT 'inquilino' CHECK (role IN ('admin', 'propietario', 'inquilino')),
  active BOOLEAN NOT NULL DEFAULT true,
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear indices
CREATE INDEX IF NOT EXISTS idx_perfiles_email ON public.perfiles(email);
CREATE INDEX IF NOT EXISTS idx_perfiles_role ON public.perfiles(role);
CREATE INDEX IF NOT EXISTS idx_perfiles_active ON public.perfiles(active);
CREATE INDEX IF NOT EXISTS idx_perfiles_blocked ON public.perfiles(blocked);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_perfiles_updated_at
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

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
INSERT INTO public.perfiles (id, email, nombre, role, active, blocked)
SELECT id, email, 'Administrador', 'admin', true, false
FROM auth.users
WHERE email = 'ceo@arrenlex.com'
ON CONFLICT (id) DO NOTHING;
