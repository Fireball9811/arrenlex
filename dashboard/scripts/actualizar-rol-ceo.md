# Actualizar rol de ceo@arrenlex.com a propietario

Ejecutar en **Supabase Dashboard → SQL Editor** (una sola vez).

## Si el usuario ya tiene fila en `perfiles`

```sql
UPDATE public.perfiles
SET role = 'propietario'
WHERE id = (SELECT id FROM auth.users WHERE email = 'ceo@arrenlex.com' LIMIT 1);
```

## Si el usuario aún no tiene fila en `perfiles`

Primero obtener el `id` del usuario:

```sql
SELECT id FROM auth.users WHERE email = 'ceo@arrenlex.com' LIMIT 1;
```

Luego insertar (reemplazar `<USER_ID>` por el UUID obtenido):

```sql
INSERT INTO public.perfiles (id, email, nombre, role, activo, bloqueado, creado_en, actualizado_en)
VALUES (
  '<USER_ID>',
  'ceo@arrenlex.com',
  'CEO',
  'propietario',
  true,
  false,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET role = 'propietario', actualizado_en = now();
```

Si la tabla `perfiles` tiene otras columnas obligatorias o nombres distintos, ajustar según el esquema real.

## Comportamiento tras el cambio

- La app usa la tabla `perfiles` como **fuente de verdad** del rol (`lib/auth/role.ts`).
- Tras actualizar la fila, ceo@arrenlex.com:
  - Será redirigido a `/propietario/dashboard` al ir a `/dashboard` o tras login.
  - Verá el menú de propietario (`propietario-sidebar.tsx`): Dashboard, Propiedades, Contratos, Invitaciones, etc.
- Cerrar sesión y volver a iniciar sesión asegura que no quede caché de rol en el cliente.
