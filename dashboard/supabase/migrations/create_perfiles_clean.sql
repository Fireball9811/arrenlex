-- Crear tabla perfiles desde cero con columnas en español
-- Este SQL elimina la tabla si existe y la crea de nuevo

-- Paso 1: Eliminar tabla si existe (esto borra datos)
DROP TABLE IF EXISTS public.perfiles CASCADE;

-- Paso 2: Crear tabla con columnas en español
CREATE TABLE public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nombre TEXT,
  role TEXT NOT NULL DEFAULT 'inquilino' CHECK (role IN ('admin', 'propietario', 'inquilino')),
  activo BOOLEAN NOT NULL DEFAULT true,
  bloqueado BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Paso 3: Crear índices
CREATE INDEX idx_perfiles_email ON public.perfiles(email);
CREATE INDEX idx_perfiles_role ON public.perfiles(role);
CREATE INDEX idx_perfiles_activo ON public.perfiles(activo);
CREATE INDEX idx_perfiles_bloqueado ON public.perfiles(bloqueado);

-- Paso 4: Trigger para actualizar actualizado_en
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

-- Paso 5: Trigger para crear perfil automáticamente
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

-- Paso 6: Habilitar RLS
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Paso 7: Policies RLS
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

-- Paso 8: Insertar perfil inicial para admin
INSERT INTO public.perfiles (id, email, nombre, role, activo, bloqueado)
SELECT id, email, 'Administrador', 'admin', true, false
FROM auth.users
WHERE email = 'ceo@arrenlex.com';
