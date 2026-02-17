-- Tabla para configuración SMTP con credenciales encriptadas
-- Permite cambiar las credenciales sin redeploy, solo desde BD
-- La contraseña se encripta con AES-256 antes de guardar

CREATE TABLE IF NOT EXISTS smtp_config (
  id SERIAL PRIMARY KEY,
  smtp_host TEXT NOT NULL DEFAULT 'smtp.office365.com',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL,
  smtp_pass_encrypted TEXT NOT NULL,
  email_from TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentario de la tabla
COMMENT ON TABLE smtp_config IS 'Configuración SMTP para envío de correos. Las credenciales están encriptadas con AES-256. Solo admin puede acceder.';

-- Comentarios de columnas
COMMENT ON COLUMN smtp_config.smtp_host IS 'Servidor SMTP (ej: smtp.office365.com)';
COMMENT ON COLUMN smtp_config.smtp_port IS 'Puerto SMTP (587 para STARTTLS, 465 para SSL)';
COMMENT ON COLUMN smtp_config.smtp_user IS 'Usuario SMTP (usualmente el correo completo)';
COMMENT ON COLUMN smtp_config.smtp_pass_encrypted IS 'Contraseña SMTP encriptada con AES-256-CBC';
COMMENT ON COLUMN smtp_config.email_from IS 'Correo remitente para los mensajes enviados';
COMMENT ON COLUMN smtp_config.active IS 'Si está en false, se usa la siguiente configuración activa';

-- Habilitar Row Level Security
ALTER TABLE smtp_config ENABLE ROW LEVEL SECURITY;

-- Política: Solo usuarios administradores pueden ver/modificar la configuración SMTP
CREATE POLICY smtp_admin_only ON smtp_config
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.perfiles WHERE role = 'admin'
    )
  );

-- Índice para búsqueda rápida de configuración activa
CREATE INDEX IF NOT EXISTS idx_smtp_config_active ON public.smtp_config(active) WHERE active = true;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_smtp_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER smtp_config_updated_at
  BEFORE UPDATE ON smtp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_smtp_config_updated_at();
