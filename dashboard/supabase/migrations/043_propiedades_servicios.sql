CREATE TABLE IF NOT EXISTS propiedades_servicios (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id      UUID        NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  nombre            TEXT        NOT NULL,
  referencia        TEXT,
  pagina_web        TEXT,
  telefono          TEXT,
  pago_promedio     NUMERIC     DEFAULT 0,
  estrato           INTEGER,
  fecha_vencimiento DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_propiedades_servicios_propiedad_id
  ON propiedades_servicios(propiedad_id);

ALTER TABLE propiedades_servicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "propietario_servicios_all" ON propiedades_servicios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM propiedades p
      WHERE p.id = propiedad_id AND p.user_id = auth.uid()
    )
  );
