-- Salarios, empresas, tiempo de servicio y referencias para arrendatarios
ALTER TABLE arrendatarios
  ADD COLUMN IF NOT EXISTS salario_principal NUMERIC,
  ADD COLUMN IF NOT EXISTS salario_secundario NUMERIC,
  ADD COLUMN IF NOT EXISTS empresa_principal TEXT,
  ADD COLUMN IF NOT EXISTS empresa_secundaria TEXT,
  ADD COLUMN IF NOT EXISTS tiempo_servicio_principal TEXT,
  ADD COLUMN IF NOT EXISTS tiempo_servicio_secundario TEXT,
  ADD COLUMN IF NOT EXISTS ref_familiar_1_nombre TEXT,
  ADD COLUMN IF NOT EXISTS ref_familiar_1_parentesco TEXT,
  ADD COLUMN IF NOT EXISTS ref_familiar_2_nombre TEXT,
  ADD COLUMN IF NOT EXISTS ref_familiar_2_parentesco TEXT,
  ADD COLUMN IF NOT EXISTS ref_personal_1_nombre TEXT,
  ADD COLUMN IF NOT EXISTS ref_personal_1_cedula TEXT,
  ADD COLUMN IF NOT EXISTS ref_personal_1_telefono TEXT,
  ADD COLUMN IF NOT EXISTS ref_personal_2_nombre TEXT,
  ADD COLUMN IF NOT EXISTS ref_personal_2_cedula TEXT,
  ADD COLUMN IF NOT EXISTS ref_personal_2_telefono TEXT;
