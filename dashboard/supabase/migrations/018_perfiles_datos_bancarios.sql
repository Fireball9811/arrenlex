-- ==========================================
-- Migración 018: Datos bancarios de propietarios
-- ==========================================
-- Agrega campos para almacenar hasta 2 cuentas bancarias y 2 llaves bancarias
-- por perfil (principalmente para propietarios)
-- ==========================================

-- Habilitar extensión para verificar si la tabla existe
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT,
    role TEXT NOT NULL DEFAULT 'inquilino' CHECK (role IN ('admin', 'propietario', 'inquilino', 'maintenance_special', 'insurance_special', 'lawyer_special')),
    activo BOOLEAN NOT NULL DEFAULT true,
    bloqueado BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    celular TEXT,
    cedula TEXT,
    cedula_lugar_expedicion TEXT,
    direccion TEXT
);

-- Agregar campos bancarios y llaves a la tabla perfiles
ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS cuenta_bancaria_1_entidad TEXT,
ADD COLUMN IF NOT EXISTS cuenta_bancaria_1_numero TEXT,
ADD COLUMN IF NOT EXISTS cuenta_bancaria_1_tipo TEXT,
ADD COLUMN IF NOT EXISTS cuenta_bancaria_2_entidad TEXT,
ADD COLUMN IF NOT EXISTS cuenta_bancaria_2_numero TEXT,
ADD COLUMN IF NOT EXISTS cuenta_bancaria_2_tipo TEXT,
ADD COLUMN IF NOT EXISTS llave_bancaria_1 TEXT,
ADD COLUMN IF NOT EXISTS llave_bancaria_2 TEXT;

-- Comentarios sobre los nuevos campos
COMMENT ON COLUMN public.perfiles.cuenta_bancaria_1_entidad IS 'Nombre de la entidad bancaria (primera cuenta)';
COMMENT ON COLUMN public.perfiles.cuenta_bancaria_1_numero IS 'Número de cuenta bancaria (primera cuenta)';
COMMENT ON COLUMN public.perfiles.cuenta_bancaria_1_tipo IS 'Tipo de cuenta: ahorros, corriente, etc (primera cuenta)';
COMMENT ON COLUMN public.perfiles.cuenta_bancaria_2_entidad IS 'Nombre de la entidad bancaria (segunda cuenta)';
COMMENT ON COLUMN public.perfiles.cuenta_bancaria_2_numero IS 'Número de cuenta bancaria (segunda cuenta)';
COMMENT ON COLUMN public.perfiles.cuenta_bancaria_2_tipo IS 'Tipo de cuenta: ahorros, corriente, etc (segunda cuenta)';
COMMENT ON COLUMN public.perfiles.llave_bancaria_1 IS 'Llave bancaria para transacciones (primera llave)';
COMMENT ON COLUMN public.perfiles.llave_bancaria_2 IS 'Llave bancaria para transacciones (segunda llave)';

-- Crear índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_perfiles_role_activo ON public.perfiles(role, activo);
CREATE INDEX IF NOT EXISTS idx_perfiles_bloqueado ON public.perfiles(bloqueado);

-- Trigger para actualizar actualizado_en automáticamente
CREATE OR REPLACE FUNCTION public.update_perfiles_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_perfiles_actualizado_en ON public.perfiles;
CREATE TRIGGER trigger_update_perfiles_actualizado_en
    BEFORE UPDATE ON public.perfiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_perfiles_actualizado_en();
