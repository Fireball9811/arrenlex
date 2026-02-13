-- Personas que habitarán el inmueble, mascotas, vehículos y autorización de datos
ALTER TABLE arrendatarios
  ADD COLUMN IF NOT EXISTS adultos_habitantes INTEGER,
  ADD COLUMN IF NOT EXISTS ninos_habitantes INTEGER,
  ADD COLUMN IF NOT EXISTS mascotas_cantidad INTEGER,
  ADD COLUMN IF NOT EXISTS vehiculos_cantidad INTEGER,
  ADD COLUMN IF NOT EXISTS vehiculos_placas TEXT,
  ADD COLUMN IF NOT EXISTS autorizacion_datos BOOLEAN DEFAULT false;
