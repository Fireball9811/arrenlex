-- Orden personalizado de propiedades por propietario (dashboard y formularios)
ALTER TABLE propiedades
  ADD COLUMN IF NOT EXISTS orden_display INTEGER NULL;

COMMENT ON COLUMN propiedades.orden_display IS
  'Orden de visualización asignado por el propietario. NULL = al final del listado.';

CREATE INDEX IF NOT EXISTS idx_propiedades_user_orden
  ON propiedades (user_id, orden_display ASC NULLS LAST);
