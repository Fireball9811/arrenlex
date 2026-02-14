-- ============================================================
-- Tabla Users para autenticación (SQL Server)
-- Ejecutar en la base de datos que use la aplicación.
-- ============================================================

-- Crear tabla Users si no existe (incluye columnas de password reset)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
  CREATE TABLE dbo.Users (
    id NVARCHAR(128) NOT NULL PRIMARY KEY DEFAULT (LOWER(CONVERT(NVARCHAR(128), NEWID()))),
    email NVARCHAR(256) NOT NULL,
    passwordHash NVARCHAR(256) NOT NULL,
    role NVARCHAR(32) NOT NULL DEFAULT 'inquilino' CHECK (role IN ('admin', 'propietario', 'inquilino')),
    activo BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    -- Campos para recuperación de contraseña (nunca guardar token en texto plano)
    resetToken NVARCHAR(256) NULL,
    resetTokenExpires DATETIME2 NULL
  );

  CREATE UNIQUE INDEX IX_Users_Email ON dbo.Users(email);
  CREATE INDEX IX_Users_ResetToken ON dbo.Users(resetToken) WHERE resetToken IS NOT NULL;
END
GO
