-- Permitir que usuarios anónimos (landing) lean solo propiedades disponibles
-- para poder listar ciudades en el dropdown sin login.
CREATE POLICY "Anon puede listar propiedades disponibles"
  ON propiedades FOR SELECT
  TO anon
  USING (estado = 'disponible');
