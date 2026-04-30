-- ============================================
-- DEPURACIÓN: Verificar estado de la tabla perfiles
-- ============================================

-- 1. Verificar si la tabla perfiles existe
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'perfiles';

-- 2. Contar cuántos registros hay en perfiles
SELECT COUNT(*) as total_perfiles
FROM perfiles;

-- 3. Verificar si hay usuarios en auth.users
SELECT COUNT(*) as total_auth_users
FROM auth.users;

-- 4. Si hay usuarios en auth.users pero no en perfiles,
-- podemos ver los emails de auth.users
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 5. Si necesitas crear perfiles para los usuarios de auth.users:
-- Descomenta y ejecuta esto SOLO si el paso 3 muestra usuarios pero el paso 2 muestra 0

/*
INSERT INTO perfiles (id, email, role, activo, bloqueado, username)
SELECT
  id,
  email,
  'inquilino' as role,
  true as activo,
  false as bloqueado,
  SPLIT_PART(email, '@', 1) as username  -- Usa la parte antes del @ como username inicial
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM perfiles WHERE perfiles.id = auth.users.id
);
*/

-- 6. Después de crear los perfiles, verifica
SELECT COUNT(*) as total_perfiles
FROM perfiles;

-- 7. Lista los perfiles creados
SELECT id, email, username, nombre, role
FROM perfiles
ORDER BY id DESC;
