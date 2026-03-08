-- Migración: tabla contactos_landing para formulario "Contáctenos" de la landing.
-- Guarda nombre, celular, email, tipo (propietario/arrendatario) y fecha.
-- Los datos se insertan desde la API pública; acceso solo vía APIs con service_role.

-- ============================================
-- 1. CREAR TABLA contactos_landing
-- ============================================
CREATE TABLE IF NOT EXISTS contactos_landing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  celular TEXT NOT NULL,
  email TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('propietario', 'arrendatario')),
  fecha_contacto TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'contactado', 'archivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contactos_landing IS 'Contactos del formulario Contáctenos en la landing (propietarios o arrendatarios interesados)';
COMMENT ON COLUMN contactos_landing.nombre IS 'Nombre completo del contacto';
COMMENT ON COLUMN contactos_landing.celular IS 'Número de celular';
COMMENT ON COLUMN contactos_landing.email IS 'Correo electrónico';
COMMENT ON COLUMN contactos_landing.tipo IS 'propietario = tiene inmueble para arrendar; arrendatario = busca arrendar';
COMMENT ON COLUMN contactos_landing.fecha_contacto IS 'Fecha y hora en que el usuario envió el formulario';
COMMENT ON COLUMN contactos_landing.estado IS 'pendiente, contactado, archivado';

-- ============================================
-- 2. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contactos_landing_tipo ON contactos_landing(tipo);
CREATE INDEX IF NOT EXISTS idx_contactos_landing_fecha_contacto ON contactos_landing(fecha_contacto);
CREATE INDEX IF NOT EXISTS idx_contactos_landing_estado ON contactos_landing(estado);
CREATE INDEX IF NOT EXISTS idx_contactos_landing_email ON contactos_landing(email);
