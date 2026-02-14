-- MIGRACIÓN: Renombrar columnas de inglés a español
-- Ejecutar esto PRIMERO en Supabase SQL Editor

-- Paso 1: Renombrar columnas si la tabla ya existe
DO $$
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'perfiles'
    ) THEN
        -- Renombrar active → activo (si existe)
        IF EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'perfiles'
            AND column_name = 'active'
        ) THEN
            ALTER TABLE public.perfiles RENAME COLUMN active TO activo;
        END IF;

        -- Renombrar blocked → bloqueado (si existe)
        IF EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'perfiles'
            AND column_name = 'blocked'
        ) THEN
            ALTER TABLE public.perfiles RENAME COLUMN blocked TO bloqueado;
        END IF;

        -- Renombrar created_at → creado_en (si existe)
        IF EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'perfiles'
            AND column_name = 'created_at'
        ) THEN
            ALTER TABLE public.perfiles RENAME COLUMN created_at TO creado_en;
        END IF;

        -- Renombrar updated_at → actualizado_en (si existe)
        IF EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'perfiles'
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE public.perfiles RENAME COLUMN updated_at TO actualizado_en;
        END IF;
    END IF;
END $$;

-- Paso 2: Crear índices con nombres en español
DROP INDEX IF EXISTS public.idx_perfiles_active;
DROP INDEX IF EXISTS public.idx_perfiles_blocked;
DROP INDEX IF EXISTS public.idx_perfiles_created_at;
DROP INDEX IF EXISTS public.idx_perfiles_updated_at;

CREATE INDEX IF NOT EXISTS idx_perfiles_activo ON public.perfiles(activo);
CREATE INDEX IF NOT EXISTS idx_perfiles_bloqueado ON public.perfiles(bloqueado);

-- Paso 3: Crear/actualizar trigger para actualizado_en
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

-- Paso 4: Crear trigger para auto-crear perfil
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

-- Paso 5: Habilitar RLS (si no está habilitado)
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Paso 6: Crear policies RLS
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

-- Paso 7: Insertar perfil inicial para admin
INSERT INTO public.perfiles (id, email, nombre, role, activo, bloqueado)
SELECT id, email, 'Administrador', 'admin', true, false
FROM auth.users
WHERE email = 'ceo@arrenlex.com'
AND NOT EXISTS (
  SELECT 1 FROM public.perfiles WHERE id = auth.users.id
);
