-- Tabla para relacionar documentos con contratos
-- Cada documento está vinculado a un contrato específico

CREATE TABLE IF NOT EXISTS documentos_contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- mime-type del archivo
  url TEXT NOT NULL, -- ruta en storage: documentos/contrato_id/nombre_archivo
  subido_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_documentos_contratos_contrato_id ON documentos_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_documentos_contratos_created_at ON documentos_contratos(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_documentos_contratos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documentos_contratos_updated_at
  BEFORE UPDATE ON documentos_contratos
  FOR EACH ROW
  EXECUTE FUNCTION update_documentos_contratos_updated_at();

-- Comentario
COMMENT ON TABLE documentos_contratos IS 'Documentos adjuntos a contratos (PDF, imágenes, Word)';
COMMENT ON COLUMN documentos_contratos.contrato_id IS 'Contrato al que pertenece el documento';
COMMENT ON COLUMN documentos_contratos.nombre IS 'Nombre original del archivo';
COMMENT ON COLUMN documentos_contratos.tipo IS 'MIME type del archivo';
COMMENT ON COLUMN documentos_contratos.url IS 'Ruta del archivo en storage';
COMMENT ON COLUMN documentos_contratos.subido_por IS 'Usuario que subió el documento';
