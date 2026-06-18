-- Backfill de coarrendatario en arrendatarios existentes.
-- Objetivo: contratos ya creados con 2 aplicantes donde solo quedó visible el principal.
-- Estrategia:
--   1) localizar intake principal por contrato (propiedad + email del arrendatario),
--   2) tomar el par del mismo grupo_solicitud_id,
--   3) completar campos coarrendatario_* y datos secundarios faltantes.

WITH intake_principal_por_contrato AS (
  SELECT DISTINCT ON (c.id)
    c.id AS contrato_id,
    c.arrendatario_id,
    i.id AS intake_principal_id,
    i.grupo_solicitud_id
  FROM contratos c
  JOIN arrendatarios a
    ON a.id = c.arrendatario_id
  JOIN arrenlex_form_intake i
    ON i.propiedad_id = c.propiedad_id
   AND lower(coalesce(i.email, '')) = lower(coalesce(a.email, ''))
  WHERE nullif(trim(coalesce(i.grupo_solicitud_id, '')), '') IS NOT NULL
  ORDER BY c.id, i.created_at DESC
),
intake_coarrendatario AS (
  SELECT DISTINCT ON (ip.arrendatario_id)
    ip.arrendatario_id,
    co.nombre,
    co.cedula,
    co.telefono,
    co.email,
    co.cedula_ciudad_expedicion,
    co.salario_principal,
    co.empresa_principal,
    co.tiempo_servicio_principal_meses
  FROM intake_principal_por_contrato ip
  JOIN arrenlex_form_intake co
    ON co.grupo_solicitud_id = ip.grupo_solicitud_id
   AND co.id <> ip.intake_principal_id
  ORDER BY ip.arrendatario_id, co.created_at DESC
)
UPDATE arrendatarios a
SET
  coarrendatario_nombre = COALESCE(NULLIF(a.coarrendatario_nombre, ''), ic.nombre),
  coarrendatario_cedula = COALESCE(NULLIF(a.coarrendatario_cedula, ''), ic.cedula),
  coarrendatario_telefono = COALESCE(NULLIF(a.coarrendatario_telefono, ''), ic.telefono),
  coarrendatario_email = COALESCE(NULLIF(a.coarrendatario_email, ''), lower(ic.email)),
  coarrendatario_cedula_expedicion = COALESCE(NULLIF(a.coarrendatario_cedula_expedicion, ''), ic.cedula_ciudad_expedicion),
  salario_secundario = COALESCE(a.salario_secundario, ic.salario_principal),
  empresa_secundaria = COALESCE(NULLIF(a.empresa_secundaria, ''), ic.empresa_principal),
  tiempo_servicio_secundario_meses = COALESCE(a.tiempo_servicio_secundario_meses, ic.tiempo_servicio_principal_meses)
FROM intake_coarrendatario ic
WHERE a.id = ic.arrendatario_id
  AND (
    NULLIF(a.coarrendatario_nombre, '') IS NULL
    OR NULLIF(a.coarrendatario_cedula, '') IS NULL
    OR NULLIF(a.coarrendatario_telefono, '') IS NULL
    OR NULLIF(a.coarrendatario_email, '') IS NULL
    OR NULLIF(a.coarrendatario_cedula_expedicion, '') IS NULL
    OR a.salario_secundario IS NULL
    OR NULLIF(a.empresa_secundaria, '') IS NULL
    OR a.tiempo_servicio_secundario_meses IS NULL
  );
