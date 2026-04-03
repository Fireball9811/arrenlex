# ARRENLEX - Contexto global del proyecto para Claude

## Que es Arrenlex
Plataforma de gestion de arriendo de propiedades inmobiliarias.
Permite administrar propiedades, contratos, pagos, inquilinos, propietarios y mantenimiento.
Esta en produccion y en uso activo.

## Stack tecnico
- Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Backend: API Routes de Next.js (en /app/api/)
- Base de datos: Supabase (PostgreSQL) con Row Level Security (RLS)
- Auth: Supabase Auth (supabase.auth.signInWithPassword) - unico sistema activo
- Deploy: Vercel (produccion automatica desde branch main)
- Repo: https://github.com/Fireball9811/arrenlex

## Estructura del proyecto
Ruta local: C:\Arrenlex\dashboard
MCP filesystem activo apuntando a esta ruta.

```
app/
  (auth)/         - Layouts de autenticacion
  (dashboard)/    - Layouts del dashboard
  api/            - API Routes del backend
    auth/         - login, logout, me, callback, role
    contacto/     - Formulario de contacto landing
    contratos/    - CRUD contratos
    pagos/        - CRUD pagos
    propiedades/  - CRUD propiedades
    arrendatarios/- CRUD arrendatarios
    inquilino/    - Endpoints del inquilino
    propietario/  - Endpoints del propietario
    admin/        - Endpoints de administracion
    intake/       - Formulario de aplicacion publica
    solicitudes-visita/ - Solicitudes publicas
    mantenimiento/- Tickets de mantenimiento
    recibos-pago/ - Recibos
    reportes/     - Reportes
  login/          - Pagina de login
  admin/          - Dashboard admin
  propietario/    - Dashboard propietario
  inquilino/      - Dashboard inquilino

lib/
  supabase/
    client.ts     - Cliente browser (createBrowserClient)
    server.ts     - Cliente servidor (createServerClient + cookies)
    admin.ts      - Cliente service_role (solo servidor, nunca cliente)
  auth/
    role.ts       - getUserRole() - fuente de verdad de roles
    session-sql.ts- DEPRECADO - sistema JWT antiguo, no usar
    redirect-by-role.ts
    temp-password.ts
  api-error.ts    - Manejo centralizado de errores (handleApiError, handleSupabaseError)
  email/          - Envio de emails (Resend o SMTP)
  whatsapp/       - Notificaciones WhatsApp
  hooks/          - React hooks custom
  i18n/           - Internacionalizacion ES/EN

components/
  auth/           - SignOutButton, UserEmail
  layout/         - Sidebars por rol, nav, guards
  ui/             - Componentes shadcn/ui
  propiedades/    - Componentes de propiedades
  contratos/      - Componentes de contratos
  inquilino/      - Componentes del inquilino
  admin/          - Componentes de admin
```

## Roles del sistema
- admin: acceso total
- propietario: ve y gestiona sus propiedades y contratos
- inquilino: ve sus contratos y pagos
- maintenance_special: acceso limitado a mantenimiento
- insurance_special: acceso limitado a seguros
- lawyer_special: acceso limitado a legal

La fuente de verdad del rol es la tabla `perfiles` en Supabase, columna `role`.
La funcion `getUserRole()` en `lib/auth/role.ts` es la unica que debe usarse.

## Autenticacion
- Login: `supabase.auth.signInWithPassword()` en el frontend (login/page.tsx)
- Middleware: `middleware.ts` en la raiz - protege rutas por rol
- Logout: `components/auth/sign-out-button.tsx` usa `supabase.auth.signOut()`
- Rutas publicas definidas en `middleware.ts` en PUBLIC_PATHS y PUBLIC_PATH_PATTERNS
- El sistema JWT en `lib/auth/session-sql.ts` esta DEPRECADO y no se usa

## Base de datos - Tablas principales
- `perfiles` - datos del usuario (id = auth.users.id, role, nombre, cedula)
- `propiedades` - propiedades inmobiliarias (user_id = propietario)
- `contratos` - contratos de arriendo (user_id = propietario, arrendatario_id)
- `arrendatarios` - datos de inquilinos registrados
- `pagos` - pagos de arriendo
- `contactos_landing` - leads del formulario publico
- `mantenimiento` - tickets de mantenimiento

## Clientes Supabase - reglas criticas
- `createClient()` de lib/supabase/client.ts - solo en componentes "use client"
- `createClient()` de lib/supabase/server.ts - solo en Server Components y API Routes
- `createAdminClient()` de lib/supabase/admin.ts - solo en servidor, usa service_role
  NUNCA exponer service_role al cliente
- Para operaciones que requieren bypass de RLS, usar siempre createAdminClient()

## Manejo de errores
Archivo: `lib/api-error.ts`
- `handleApiError(context, err)` - para errores generales con stack trace
- `handleSupabaseError(context, error)` - para errores de Supabase
Ambas funciones: loggean detalle completo en consola (visible en Vercel logs)
y devuelven solo "Internal server error" al cliente.

## Variables de entorno requeridas
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
- SUPABASE_SERVICE_ROLE_KEY - solo servidor
- JWT_SECRET o AUTH_SECRET - para sistema JWT (deprecado pero aun referenciado)
- ADMIN_EMAILS - lista separada por comas de emails admin

## Git y deploy
- Branch principal: main
- Deploy automatico en Vercel al hacer push a main
- Flujo: trabajar en main o crear branches por feature, PR a main
- Archivo `nul` en raiz del repo: archivo fantasma de Windows, no se puede borrar,
  configurado con skip-worktree. Usar `git add` con archivos especificos en lugar de `git add -A`

## Historial de cambios importantes
### Security fixes (completado, mergeado a main - Abril 2026)
- Se agrego middleware.ts con proteccion de rutas por rol
- Se elimino proxy.ts que conflictuaba con middleware.ts
- Se corrigio manejo de errores en API routes (api-error.ts)
- Se marco session-sql.ts como deprecado
- Commits: backup before security fixes, security fixes applied,
  add middleware route protection by role, Remove proxy.ts keep middleware.ts,
  Add centralized API error handler with stack traces,
  Mark SQL/JWT auth as deprecated

## Pendientes conocidos
- Revisar si `lib/auth/session-sql.ts` y `app/api/auth/login/route.ts` pueden eliminarse
  (sistema JWT legacy, nadie los llama desde el frontend)
- Revisar `app/api/auth/logout/route.ts` (solo limpia cookie JWT, no cierra sesion Supabase)

## Como trabajar con Claude en este proyecto
1. MCP filesystem debe estar activo apuntando a C:\Arrenlex\dashboard
2. Claude puede leer y editar archivos directamente
3. Siempre hacer backup antes de cambios: git commit -m "Backup before ..."
4. Para git add usar archivos especificos, no git add -A (por el archivo nul)
5. Push siempre a main: git push origin main
