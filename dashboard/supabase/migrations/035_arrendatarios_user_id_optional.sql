-- Permitir que user_id sea NULL en arrendatarios
-- Esto permite crear arrendatarios sin usuario del sistema inicialmente
-- El usuario se puede crear después con el botón "Sin usuario"

-- Primero, si hay una restricción NOT NULL, eliminarla
ALTER TABLE arrendatarios ALTER COLUMN user_id DROP NOT NULL;

-- Actualizar políticas RLS para permitir que admins gestionen arrendatarios sin usuario
DROP POLICY IF EXISTS "Usuarios pueden ver sus arrendatarios" ON arrendatarios;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus arrendatarios" ON arrendatarios;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus arrendatarios" ON arrendatarios;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus arrendatarios" ON arrendatarios;

-- Nueva política: los admins pueden ver todos los arrendatarios
CREATE POLICY "Admins pueden ver todos los arrendatarios"
  ON arrendatarios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin'
    )
    OR auth.uid() = user_id
  );

-- Nueva política: los admins pueden insertar arrendatarios sin user_id
CREATE POLICY "Admins pueden insertar arrendatarios"
  ON arrendatarios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin'
    )
    OR auth.uid() = user_id
  );

-- Nueva política: los admins pueden actualizar arrendatarios
CREATE POLICY "Admins pueden actualizar arrendatarios"
  ON arrendatarios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin'
    )
    OR auth.uid() = user_id
  );

-- Nueva política: los admins pueden eliminar arrendatarios
CREATE POLICY "Admins pueden eliminar arrendatarios"
  ON arrendatarios FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin'
    )
    OR auth.uid() = user_id
  );
