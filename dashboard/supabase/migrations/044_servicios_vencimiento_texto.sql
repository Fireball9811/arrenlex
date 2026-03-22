-- Cambiar fecha_vencimiento de DATE a TEXT para almacenar rango de días del mes
ALTER TABLE propiedades_servicios
  ALTER COLUMN fecha_vencimiento TYPE TEXT USING fecha_vencimiento::TEXT;
