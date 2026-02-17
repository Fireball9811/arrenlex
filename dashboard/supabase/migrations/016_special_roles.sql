-- ============================================
-- MIGRACIÓN: ROLES ESPECIALES ARRENLEX
-- maintenance_special, insurance_special, lawyer_special
-- ============================================

-- 1. Extender CHECK constraint para incluir roles especiales
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_role_check;

ALTER TABLE perfiles
ADD CONSTRAINT perfiles_role_check
CHECK (role IN ('admin', 'propietario', 'inquilino', 'maintenance_special', 'insurance_special', 'lawyer_special'));

-- 2. Agregar campo assigned_to a solicitudes_mantenimiento
ALTER TABLE solicitudes_mantenimiento
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES perfiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN solicitudes_mantenimiento.assigned_to IS 'Usuario especial asignado (maintenance_special)';

CREATE INDEX IF NOT EXISTS idx_solicitudes_mantenimiento_assigned_to
ON solicitudes_mantenimiento(assigned_to);

-- ============================================
-- TABLA: CASOS DE SEGUROS
-- ============================================
CREATE TABLE IF NOT EXISTS casos_seguros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('robo', 'incendio', 'danos', 'responsabilidad_civil', 'otro')),
  descripcion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_proceso', 'cerrado', 'rechazado')),
  assigned_to UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_incidente DATE,
  monto_reclamado NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE casos_seguros IS 'Casos de seguros asignados a especialistas insurance_special';
COMMENT ON COLUMN casos_seguros.assigned_to IS 'Especialista de seguros asignado';

CREATE INDEX IF NOT EXISTS idx_casos_seguros_propiedad_id ON casos_seguros(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_casos_seguros_assigned_to ON casos_seguros(assigned_to);
CREATE INDEX IF NOT EXISTS idx_casos_seguros_estado ON casos_seguros(estado);

-- ============================================
-- TABLA: CASOS LEGALES
-- ============================================
CREATE TABLE IF NOT EXISTS casos_legales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('desalojo', 'mora', 'incumplimiento', 'disputa', 'otro')),
  descripcion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_proceso', 'cerrado', 'archivado')),
  assigned_to UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_apertura DATE,
  prioridad TEXT DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE casos_legales IS 'Casos legales asignados a abogados especialistas lawyer_special';
COMMENT ON COLUMN casos_legales.assigned_to IS 'Abogado especialista asignado';

CREATE INDEX IF NOT EXISTS idx_casos_legales_propiedad_id ON casos_legales(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_casos_legales_assigned_to ON casos_legales(assigned_to);
CREATE INDEX IF NOT EXISTS idx_casos_legales_estado ON casos_legales(estado);

-- ============================================
-- TRIGGER: updated_at PARA TABLAS NUEVAS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_casos_seguros_updated_at
  BEFORE UPDATE ON casos_seguros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_casos_legales_updated_at
  BEFORE UPDATE ON casos_legales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- POLÍTICAS RLS: SOLICITUDES DE MANTENIMIENTO
-- ============================================
-- IMPORTANTE: Estas políticas deben cubrir todos los roles existentes
-- para no romper la funcionalidad actual de la API de mantenimiento
--
-- Roles que necesitan acceso:
-- - admin: ve todas, puede modificar
-- - propietario: ve las de sus propiedades
-- - inquilino: puede crear (pero no ver según API actual)
-- - maintenance_special: ve solo sus asignadas
-- ============================================

-- Asegurar que RLS esté habilitado
ALTER TABLE solicitudes_mantenimiento ENABLE ROW LEVEL SECURITY;

-- Política 1: maintenance_special ve solo sus asignadas (SELECT)
CREATE POLICY "Especialista mantenimiento ve solo asignadas"
  ON solicitudes_mantenimiento FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'maintenance_special')
    AND assigned_to = auth.uid()
  );

-- Política 2: propietario ve solicitudes de sus propiedades (SELECT)
CREATE POLICY "Propietario ve solicitudes de sus propiedades"
  ON solicitudes_mantenimiento FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      WHERE p.id = auth.uid() AND p.role = 'propietario'
    )
    AND propiedad_id IN (
      SELECT id FROM propiedades WHERE user_id = auth.uid()
    )
  );

-- Política 3: todos los autenticados pueden crear (INSERT)
CREATE POLICY "Autenticados pueden crear solicitudes de mantenimiento"
  ON solicitudes_mantenimiento FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política 4: admin puede modificar todo (UPDATE/DELETE/SELECT todas)
CREATE POLICY "Admin puede todas las operaciones en solicitudes de mantenimiento"
  ON solicitudes_mantenimiento FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- POLÍTICAS RLS: CASOS DE SEGUROS
-- ============================================
ALTER TABLE casos_seguros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Especialista seguros ve solo asignadas"
  ON casos_seguros FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'insurance_special')
    AND assigned_to = auth.uid()
  );

CREATE POLICY "Admin ve todos los casos de seguros"
  ON casos_seguros FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- POLÍTICAS RLS: CASOS LEGALES
-- ============================================
ALTER TABLE casos_legales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Abogado especialista ve solo asignadas"
  ON casos_legales FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'lawyer_special')
    AND assigned_to = auth.uid()
  );

CREATE POLICY "Admin ve todos los casos legales"
  ON casos_legales FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND role = 'admin'));
