-- 051_intake_unico_arrendatario.sql
-- Agrega bandera para identificar aplicaciones en las que el arrendatario
-- declara que será el único habitante (sin coarrendatario).
-- Se usa como motivo de estudio en la revisión por parte del equipo.

ALTER TABLE arrenlex_form_intake
  ADD COLUMN IF NOT EXISTS unico_arrendatario BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN arrenlex_form_intake.unico_arrendatario IS
  'TRUE cuando el aplicante declara que vivirá solo y no hay coarrendatario. Se reporta como motivo de estudio.';
