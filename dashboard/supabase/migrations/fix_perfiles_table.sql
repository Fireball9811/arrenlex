-- Arreglar tabla perfiles - Agregar columnas faltantes si no existen
-- Ejecutar en Supabase SQL Editor

-- Asegurar que la tabla exista con las columnas correctas
DO $$
BEGIN
    -- Crear tabla si no existe
    IF NOT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'perfiles'
    ) THEN
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
    END IF;

    -- Agregar columnas faltantes una por una
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'perfiles'
        AND column_name = 'id'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'perfiles'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN email TEXT NOT NULL UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'perfiles'
        AND column_name = 'nombre'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN nombre TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'perfiles'
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN role TEXT NOT NULL DEFAULT 'inquilino' CHECK (role IN ('admin', 'propietario', 'inquilino'));
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'perfiles'
        AND column_name = 'activo'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'perfiles'
        AND column_name = 'bloqueado'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN bloqueado BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'perfiles'
        AND column_name = 'creado_en'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'perfiles'
        AND column_name = 'actualizado_en'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_perfiles_email ON public.perfiles(email);
CREATE INDEX IF NOT EXISTS idx_perfiles_role ON public.perfiles(role);
CREATE INDEX IF NOT EXISTS idx_perfiles_activo ON public.perfiles(activo);
CREATE INDEX IF NOT EXISTS idx_perfiles_bloqueado ON public.perfiles(bloqueado);

-- Crear trigger para actualizar actualizado_en
CREATE OR REPLACE FUNCTION update_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_perfiles_actualizado_en ON public.perfiles;

CREATE TRIGGER trigger_perfiles_actualizado_en
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION update_actualizado_en();

-- Crear trigger para auto-crear perfil
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

-- Crear policies
DROP POLICY IF EXISTS "Todos pueden ver perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Todos pueden insertar perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Todos pueden actualizar perfiles" ON public.perfiles;

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
AND NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.users.id);
