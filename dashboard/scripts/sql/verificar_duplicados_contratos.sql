-- ============================================
-- VERIFICAR DUPLICADOS EN CONTRATOS
-- Ejecutar antes de aplicar la migración 060
-- ============================================

-- Buscar contratos duplicados (mismo arrendatario, fecha inicio y estado)
SELECT
  arrendatario_id,
  a.nombre as arrendatario_nombre,
  a.cedula as arrendatario_cedula,
  fecha_inicio,
  estado,
  COUNT(*) as cantidad,
  STRING_AGG(id::text, ', ') as contrato_ids
FROM contratos c
JOIN arrendatarios a ON c.arrendatario_id = a.id
GROUP BY arrendatario_id, a.nombre, a.cedula, fecha_inicio, estado
HAVING COUNT(*) > 1;

-- Mostrar detalles completos de los duplicados
SELECT
  c.id as contrato_id,
  c.propiedad_id,
  p.direccion as propiedad_direccion,
  c.arrendatario_id,
  a.nombre as arrendatario_nombre,
  a.cedula as arrendatario_cedula,
  c.fecha_inicio,
  c.fecha_fin,
  c.estado,
  c.created_at
FROM contratos c
JOIN arrendatarios a ON c.arrendatario_id = a.id
LEFT JOIN propiedades p ON c.propiedad_id = p.id
WHERE EXISTS (
  SELECT 1
  FROM contratos c2
  WHERE c2.arrendatario_id = c.arrendatario_id
    AND c2.fecha_inicio = c.fecha_inicio
    AND c2.estado = c.estado
    AND c2.id != c.id
)
ORDER BY c.arrendatario_id, c.fecha_inicio, c.estado;
