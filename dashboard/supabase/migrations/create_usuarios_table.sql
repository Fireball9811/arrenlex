-- Crear tabla de perfiles de usuarios con estados
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

-- Trigger para actualizar actualizado_en
CREATE OR REPLACE FUNCTION update_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_perfiles_actualizado_en
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION update_actualizado_en();

-- Trigger para crear perfil automaticamente cuando se crea un usuario en auth
CREATE OR REPLACE FUNCTION crear_perfil_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, role, activo, bloqueado)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'inquilino'),
    true,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auth_crear_perfil ON auth.users;

CREATE TRIGGER trigger_auth_crear_perfil
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION crear_perfil_usuario();

-- Habilitar RLS
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Politicas RLS simplificadas (sin restricciones por ahora)
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

-- Insertar perfil inicial para el admin si no existe
INSERT INTO public.perfiles (id, email, nombre, role, activo, bloqueado)
SELECT id, email, 'Administrador', 'admin', true, false
FROM auth.users
WHERE email = 'ceo@arrenlex.com'
ON CONFLICT (id) DO NOTHING;
