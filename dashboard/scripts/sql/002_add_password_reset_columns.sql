-- ============================================================
-- Agregar columnas de password reset a tabla Users existente
-- Ejecutar solo si la tabla Users ya existe y no tiene estas columnas.
-- ============================================================

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
  -- resetToken (hasheado, no texto plano)
  IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'resetToken'
  )
  BEGIN
    ALTER TABLE dbo.Users ADD resetToken NVARCHAR(256) NULL;
  END

  -- resetTokenExpires (ej. 15 minutos desde la solicitud)
  IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'resetTokenExpires'
  )
  BEGIN
    ALTER TABLE dbo.Users ADD resetTokenExpires DATETIME2 NULL;
  END

  -- Índice para búsqueda por token (opcional, mejora rendimiento)
  IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_ResetToken' AND object_id = OBJECT_ID('dbo.Users'))
  BEGIN
    CREATE INDEX IX_Users_ResetToken ON dbo.Users(resetToken) WHERE resetToken IS NOT NULL;
  END
END
GO
