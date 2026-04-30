-- ============================================
-- CONSULTAS CORREGIDAS PARA SUPABASE
-- Ejecuta en orden en el SQL Editor de Supabase
-- ============================================

-- PASO 1: Verificar si la columna username existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'perfiles' AND column_name = 'username';

-- Si la consulta anterior NO retorna nada, ejecuta esto:
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Crear índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfiles_username_unique
ON perfiles(username)
WHERE username IS NOT NULL;

-- ============================================

-- PASO 2: Ver todos tus usuarios
-- Esta lista los IDs y emails para que puedas identificar cuál eres tú
SELECT
  id,
  email,
  username,
  nombre,
  role
FROM perfiles
ORDER BY id DESC;  -- Usamos id en lugar de created_at

-- ============================================

-- PASO 3: Actualizar tu username
-- Reemplaza 'TU_EMAIL_AQUI' con tu email real que aparece arriba
-- Reemplaza 'Luis' con el username que quieres

UPDATE perfiles
SET username = 'Luis'
WHERE email = 'TU_EMAIL_AQUI@gmail.com';  -- Cambia esto por tu email real

-- ============================================

-- PASO 4: Verificar que se guardó
-- Reemplaza 'TU_EMAIL_AQUI' con tu email real
SELECT
  id,
  email,
  username,
  nombre
FROM perfiles
WHERE email = 'TU_EMAIL_AQUI@gmail.com';  -- Cambia esto por tu email real

-- ============================================

-- Si no sabes tu email exacto, usa esta consulta para buscar:
SELECT
  id,
  email,
  username,
  nombre
FROM perfiles
WHERE email LIKE '%gmail.com%'
   OR email LIKE '%outlook.com%'
   OR email LIKE '%hotmail.com%'
ORDER BY id DESC;

-- ============================================
