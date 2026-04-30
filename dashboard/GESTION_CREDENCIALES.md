# Sistema de Gestión de Credenciales

Este módulo permite a todos los usuarios (propietarios, inquilinos, administradores) cambiar su email (usuario de login) y contraseña de forma segura.

## Componentes

### 1. API Endpoints

#### `POST /api/auth/update-email`
Permite cambiar el email del usuario con validación de unicidad global.

**Request:**
```json
{
  "newEmail": "nuevo@correo.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email actualizado correctamente.",
  "newEmail": "nuevo@correo.com",
  "verificationRequired": true,
  "details": "Se ha enviado un email de verificación a tu nuevo correo electrónico."
}
```

**Response (Error):**
```json
{
  "error": "Este email ya está en uso.",
  "details": "El correo electrónico pertenece a otro usuario. Debes elegir uno diferente."
}
```

#### `GET /api/auth/update-email?email=correo@ejemplo.com`
Verifica si un email está disponible (para validación en tiempo real).

**Response:**
```json
{
  "available": true,
  "message": "Email disponible."
}
```

#### `POST /api/auth/update-password`
Permite cambiar la contraseña verificando la actual primero.

**Request:**
```json
{
  "currentPassword": "contraseña_actual",
  "newPassword": "nueva_contraseña"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente.",
  "details": "Tu contraseña ha sido cambiada exitosamente."
}
```

### 2. Componente React: `<GestionCredenciales />`

Componente reutilizable que incluye:
- Formulario para cambiar email con validación de unicidad en tiempo real
- Indicador visual de disponibilidad de email (✓ verde o ✗ rojo)
- Formulario para cambiar contraseña con confirmación
- Botón para mostrar/ocultar contraseñas
- Mensajes de error y éxito

#### Uso en cualquier página de perfil:

```tsx
import { GestionCredenciales } from "@/components/auth/gestion-credenciales"

function MiPerfilPage() {
  const [email, setEmail] = useState("usuario@correo.com")

  return (
    <div>
      <h1>Mi Perfil</h1>

      {/* Otros campos del perfil... */}

      {/* Sección de gestión de credenciales */}
      <GestionCredenciales
        currentEmail={email}
        onSuccess={() => {
          // Opcional: Callback cuando se actualiza el email
          console.log("Email actualizado")
        }}
      />
    </div>
  )
}
```

#### Props:

| Prop | Tipo | Descripción |
|-----|------|-------------|
| `currentEmail` | `string` | Email actual del usuario (requerido) |
| `onSuccess` | `() => void` | Callback opcional cuando se actualiza el email |

## Integración en Perfiles Existentes

### Perfil de Propietario
✅ Ya integrado en `app/propietario/perfil/page.tsx`

### Perfil de Inquilino
Para agregar en `app/inquilino/mis-datos/page.tsx`:

```tsx
import { GestionCredenciales } from "@/components/auth/gestion-credenciales"

// Agregar al final del formulario, después de la autorización de datos
<Card className="mt-6">
  <CardHeader>
    <CardTitle>Configuración de Cuenta</CardTitle>
  </CardHeader>
  <CardContent>
    <GestionCredenciales currentEmail={userEmail} />
  </CardContent>
</Card>
```

### Perfil de Administrador
Crear `app/admin/perfil/page.tsx`:

```tsx
import { GestionCredenciales } from "@/components/auth/gestion-credenciales"
import { createClient } from "@/lib/supabase/client"

export default function AdminPerfilPage() {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  if (!user) return <div>Cargando...</div>

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Perfil de Administrador</h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Rol:</strong> Administrador</p>
        </CardContent>
      </Card>

      <GestionCredenciales currentEmail={user.email} />
    </div>
  )
}
```

## Características de Seguridad

1. **Validación de unicidad global**: El email se verifica tanto en `auth.users` como en `perfiles` antes de permitir el cambio.

2. **Verificación de contraseña actual**: Se requiere la contraseña actual para cambiar email o contraseña.

3. **Validación de formato de email**: Se valida que el email tenga un formato correcto antes de enviar.

4. **Longitud mínima de contraseña**: La nueva contraseña debe tener al menos 8 caracteres.

5. **Confirmación de contraseña**: La nueva contraseña debe ingresarse dos veces para evitar errores.

6. **Email de verificación**: Supabase envía automáticamente un email de verificación al nuevo correo.

## Flujo de Cambio de Email

1. Usuario ingresa nuevo email
2. Sistema valida disponibilidad en tiempo real
3. Usuario ingresa contraseña actual
4. Sistema verifica contraseña actual
5. Sistema actualiza email en `auth.users` (envía email de verificación)
6. Sistema actualiza email en tabla `perfiles`
7. Usuario debe hacer clic en enlace de verificación enviado al nuevo email
8. Usuario puede iniciar sesión con el nuevo email

## Flujo de Cambio de Contraseña

1. Usuario ingresa contraseña actual
2. Usuario ingresa nueva contraseña (mínimo 8 caracteres)
3. Usuario confirma nueva contraseña
4. Sistema verifica contraseñas coinciden
5. Sistema verifica contraseña actual
6. Sistema actualiza contraseña en `auth.users`
7. Usuario puede iniciar sesión con la nueva contraseña

## Notas Importantes

- El cambio de email requiere verificación por correo electrónico.
- El usuario debe estar autenticado para usar estas funciones.
- Los endpoints usan `createAdminClient()` para poder modificar `auth.users`.
- Si el email ya existe en cualquier rol (admin, propietario, inquilino), el cambio será rechazado.
- Después de cambiar el email, la página se recarga automáticamente para mostrar el nuevo email.
