-- Tabla arrendatarios
CREATE TABLE IF NOT EXISTS arrendatarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cedula TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla propiedades
CREATE TABLE IF NOT EXISTS propiedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direccion TEXT NOT NULL,
  ciudad TEXT,
  barrio TEXT,
  tipo TEXT DEFAULT 'apartamento',
  habitaciones INTEGER DEFAULT 0,
  banos INTEGER DEFAULT 0,
  area INTEGER DEFAULT 0,
  valor_arriendo NUMERIC DEFAULT 0,
  descripcion TEXT,
  estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'arrendado', 'mantenimiento')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_arrendatarios_user_id ON arrendatarios(user_id);
CREATE INDEX IF NOT EXISTS idx_propiedades_user_id ON propiedades(user_id);
CREATE INDEX IF NOT EXISTS idx_propiedades_ciudad ON propiedades(ciudad);

-- RLS (Row Level Security): cada usuario solo ve sus propios datos
ALTER TABLE arrendatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;

-- Políticas para arrendatarios
CREATE POLICY "Usuarios pueden ver sus arrendatarios"
  ON arrendatarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus arrendatarios"
  ON arrendatarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus arrendatarios"
  ON arrendatarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus arrendatarios"
  ON arrendatarios FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para propiedades
CREATE POLICY "Usuarios pueden ver sus propiedades"
  ON propiedades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propiedades"
  ON propiedades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propiedades"
  ON propiedades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propiedades"
  ON propiedades FOR DELETE
  USING (auth.uid() = user_id);
