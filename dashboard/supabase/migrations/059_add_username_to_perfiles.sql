-- ============================================
-- MIGRACIÓN: Agregar campo username a perfiles
-- Permite que los usuarios tengan un nombre de usuario único
-- diferente a su email, para mostrar en la aplicación
-- ============================================

-- 1. Agregar columna username a perfiles
ALTER TABLE perfiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Crear índice único para username
-- Esto asegura que no pueda haber dos usuarios con el mismo username
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfiles_username_unique
ON perfiles(username)
WHERE username IS NOT NULL;

-- 3. Crear índice para búsquedas rápidas por username
CREATE INDEX IF NOT EXISTS idx_perfiles_username
ON perfiles(username);

-- 4. Comentario sobre la nueva columna
COMMENT ON COLUMN perfiles.username IS 'Nombre de usuario único para mostrar en la aplicación (diferente al email que se usa para login)';

-- 5. Inicializar username para usuarios existentes
-- Usamos la parte antes del @ del email como username inicial
UPDATE perfiles
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL AND email IS NOT NULL;

-- Nota: Los usuarios existentes pueden cambiar su username después
-- Si hay duplicados (dos usuarios con el mismo username inicial),
-- se agregará un número aleatorio para diferenciarlos

-- 6. Función para resolver conflictos de username duplicados
CREATE OR REPLACE FUNCTION resolve_username_duplicates()
RETURNS void AS $$
DECLARE
  duplicate_record RECORD;
  counter INTEGER := 1;
  new_username TEXT;
BEGIN
  -- Buscar usernames duplicados
  FOR duplicate_record IN
    SELECT username, COUNT(*) as count
    FROM perfiles
    WHERE username IS NOT NULL
    GROUP BY username
    HAVING COUNT(*) > 1
  LOOP
    -- Para cada duplicado, agregar un número único
    FOR counter IN 1..duplicate_record.count - 1 LOOP
      -- Buscar el primer registro duplicado sin modificar aún
      SELECT id, username INTO new_username
      FROM perfiles
      WHERE username = duplicate_record.username
      LIMIT 1 OFFSET counter - 1;

      -- Crear nuevo username único
      new_username := duplicate_record.username || counter;

      -- Actualizar el registro
      UPDATE perfiles
      SET username = new_username
      WHERE id = (SELECT id FROM perfiles WHERE username = duplicate_record.username LIMIT 1 OFFSET counter - 1);
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Ejecutar función para resolver duplicados existentes
SELECT resolve_username_duplicates();

-- 8. Eliminar la función temporal (ya no se necesita)
DROP FUNCTION IF EXISTS resolve_username_duplicates();

-- ============================================
-- RESUMEN:
--
-- La tabla perfiles ahora tiene:
-- - email: Para login y notificaciones (debe ser único)
-- - username: Para mostrar en la app (debe ser único)
--
-- Ejemplo:
-- - email: lamo9811@gmail.com
-- - username: Luis
--
-- El usuario puede iniciar sesión con su email,
-- pero en la aplicación se mostrará su username.
-- ============================================
