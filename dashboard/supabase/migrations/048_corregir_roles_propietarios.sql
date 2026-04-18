-- ============================================================================
-- CORREGIR ROLES DE PROPIETARIOS
-- Actualiza el rol a "propietario" para usuarios que tienen propiedades asignadas
-- pero su rol actual es "inquilino"
-- ============================================================================

-- Actualizar usuarios que tienen propiedades asignadas pero rol incorrecto
UPDATE perfiles p
SET role = 'propietario',
    actualizado_en = NOW()
WHERE p.role = 'inquilino'
  AND EXISTS (
    SELECT 1
    FROM propiedades
    WHERE propiedades.user_id = p.id
  );

-- Mostrar cuántos usuarios fueron actualizados
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Usuarios actualizados a propietario: %', updated_count;
END $$;

-- Crear función para mantener el rol sincronizado con las propiedades
CREATE OR REPLACE FUNCTION sync_propietario_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando se asigna una propiedad a un usuario, asegurarse de que sea propietario
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
        UPDATE perfiles
        SET role = 'propietario',
            actualizado_en = NOW()
        WHERE id = NEW.user_id
          AND role != 'propietario'
          AND role != 'admin';
    END IF;

    -- Opcional: Si un usuario ya no tiene propiedades, podría volverse inquilino
    -- (Descomentar si se desea este comportamiento)
    -- IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    --     UPDATE perfiles
    --     SET role = 'inquilino',
    --         actualizado_en = NOW()
    --     WHERE id = OLD.user_id
    --       AND role = 'propietario'
    --       AND NOT EXISTS (
    --           SELECT 1 FROM propiedades WHERE user_id = OLD.user_id
    --       );
    -- END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para sincronizar roles automáticamente
DROP TRIGGER IF EXISTS trigger_sync_propietario_role ON propiedades;
CREATE TRIGGER trigger_sync_propietario_role
    AFTER INSERT OR UPDATE ON propiedades
    FOR EACH ROW
    EXECUTE FUNCTION sync_propietario_role();

-- Comentario explicativo
COMMENT ON FUNCTION sync_propietario_role() IS 'Mantiene el rol "propietario" sincronizado cuando se asignan propiedades a un usuario';
