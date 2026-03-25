-- Agrega campo notificaciones_email a propiedades
ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS notificaciones_email BOOLEAN NOT NULL DEFAULT false;

-- Tabla para registrar notificaciones enviadas y evitar duplicados
CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id   UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('recordatorio_5_dias', 'mora_1_dia', 'seguimiento_3_dias')),
  fecha_envio   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_contrato_tipo
  ON notificaciones_enviadas (contrato_id, tipo, fecha_envio DESC);

-- RLS
ALTER TABLE notificaciones_enviadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede ver todas las notificaciones"
  ON notificaciones_enviadas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin'
    )
  );

CREATE POLICY "Admin puede insertar notificaciones"
  ON notificaciones_enviadas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin'
    )
  );
