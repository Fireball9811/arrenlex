-- Referencias familiares: cédula y teléfono; tiempo de servicio en meses
ALTER TABLE arrendatarios
  ADD COLUMN IF NOT EXISTS ref_familiar_1_cedula TEXT,
  ADD COLUMN IF NOT EXISTS ref_familiar_1_telefono TEXT,
  ADD COLUMN IF NOT EXISTS ref_familiar_2_cedula TEXT,
  ADD COLUMN IF NOT EXISTS ref_familiar_2_telefono TEXT,
  ADD COLUMN IF NOT EXISTS tiempo_servicio_principal_meses INTEGER,
  ADD COLUMN IF NOT EXISTS tiempo_servicio_secundario_meses INTEGER;
