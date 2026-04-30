-- ============================================
-- SOLUCIÓN DIRECTA: Ejecutar este SQL en Supabase
-- ============================================

-- PASO 1: Verificar si la columna existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perfiles' AND column_name = 'username'
  ) THEN
    -- La columna NO existe, crearla
    ALTER TABLE perfiles ADD COLUMN username TEXT;

    -- Crear índice único
    CREATE UNIQUE INDEX IF NOT EXISTS idx_perfiles_username_unique
    ON perfiles(username)
    WHERE username IS NOT NULL;

    RAISE NOTICE 'Columna username creada exitosamente';
  ELSE
    RAISE NOTICE 'La columna username ya existe';
  END IF;
END $$;

-- PASO 2: Verificar usuarios sin username
SELECT
  id,
  email,
  username,
  nombre,
  role
FROM perfiles
WHERE username IS NULL
LIMIT 10;

-- PASO 3: Si quieres actualizar tu username manualmente
-- Reemplaza 'TU_EMAIL' con tu email real y 'Luis' con el username que quieres
UPDATE perfiles
SET username = 'Luis'  -- Cambia esto por tu username deseado
WHERE email = 'tu_email@gmail.com';  -- Cambia esto por tu email real

-- PASO 4: Verificar que se actualizó
SELECT
  id,
  email,
  username,
  nombre,
  role
FROM perfiles
WHERE email = 'tu_email@gmail.com';  -- Cambia esto por tu email real

-- ============================================
-- Si el UPDATE anterior no funcionó, prueba con el ID:
-- Primero busca tu ID:
SELECT id, email, username FROM perfiles WHERE email LIKE '%gmail.com%';

-- Luego actualiza por ID:
UPDATE perfiles
SET username = 'Luis'
WHERE id = 'TU_ID_AQUI';  -- Usa el ID que encontraste
-- ============================================
