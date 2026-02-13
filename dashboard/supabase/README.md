# Configuración de la base de datos Supabase

## Paso obligatorio: Crear las tablas

Para que Arrenlex funcione con la base de datos, debes ejecutar la migración **una sola vez**:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard) y selecciona tu proyecto.
2. Abre **SQL Editor** en el menú lateral.
3. Haz clic en **New query**.
4. Abre el archivo `migrations/001_initial_schema.sql` y copia todo su contenido.
5. Pégalo en el editor SQL y haz clic en **Run**.

Esto creará:
- Tabla **arrendatarios** (nombre, cédula, teléfono)
- Tabla **propiedades** (dirección, ciudad, tipo, valor arriendo, etc.)
- Políticas **RLS** para que cada usuario solo vea y edite sus propios datos
