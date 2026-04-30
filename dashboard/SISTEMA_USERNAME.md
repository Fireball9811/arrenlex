# Sistema de Nombre de Usuario (Username / Alias)

Este sistema permite que los usuarios tengan un **nombre de usuario (username)** que actúa como un alias de su correo electrónico.

## ¿Qué es el Username?

El username es un **alias** que usas en la aplicación en lugar de mostrar tu correo electrónico.

### Ejemplo:
```
Email:    lamo9811@gmail.com  (para login y notificaciones)
Username: Luis                (para mostrar en la app)
```

## Ventajas del Username

1. **Privacidad**: No compartes tu correo electrónico públicamente
2. **Simplicidad**: "Luis" es más fácil de recordar que "lamo9811@gmail.com"
3. **Profesional**: Se ve mejor en contratos, recibos y documentos
4. **Personalizable**: Puedes elegir el nombre que quieras (si está disponible)

## Reglas del Username

- ✅ Debe tener entre **3 y 30 caracteres**
- ✅ Solo puede contener **letras, números, guiones (-) y guiones bajos (_)**
- ✅ Debe ser **único** en toda la base de datos
- ❌ No puede haber espacios ni caracteres especiales

### Ejemplos válidos:
- `Luis`
- `maria_garcia`
- `juan.perez.123`
- `Admin-Principal`

### Ejemplos inválidos:
- `Lu` (muy corto, menos de 3 caracteres)
- `Juan Pérez` (tiene espacio)
- `maria@123` (tiene el símbolo @)

## Componentes Implementados

### 1. Migración de Base de Datos
**Archivo**: `supabase/migrations/059_add_username_to_perfiles.sql`

Agrega el campo `username` a la tabla `perfiles` con:
- Índice único (no puede haber duplicados)
- Inicialización automática para usuarios existentes (parte del email antes del @)
- Resolución de conflictos si hay usernames duplicados

### 2. API Endpoints

#### `POST /api/auth/update-username`
Cambia el username del usuario.

**Request:**
```json
{
  "newUsername": "Luis"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Nombre de usuario actualizado correctamente.",
  "username": "Luis"
}
```

**Response (Error):**
```json
{
  "error": "Este nombre de usuario ya está en uso.",
  "details": "El nombre de usuario pertenece a otra persona."
}
```

#### `GET /api/auth/update-username?username=Luis`
Verifica si un username está disponible.

**Response:**
```json
{
  "available": true,
  "message": "Nombre de usuario disponible."
}
```

### 3. Componente React: `<GestionUsername />`

Componente reutilizable que incluye:
- Validación de disponibilidad en tiempo real
- Indicador visual (✓ verde o ✗ rojo)
- Mensajes claros de error
- Información sobre las reglas del username

## Uso en las Páginas de Perfil

### Importar el componente:
```tsx
import { GestionUsername } from "@/components/auth/gestion-username"
```

### Usar en cualquier perfil:
```tsx
<GestionUsername
  currentUsername={username} // string | null
  onSuccess={() => {
    // Opcional: Callback cuando se actualiza el username
    console.log("Username actualizado")
  }}
/>
```

## Integración Completa

### Perfil de Propietario
✅ **Ya integrado** en `app/propietario/perfil/page.tsx`

Los propietarios pueden cambiar su username desde su perfil.

### Perfil de Inquilino
Para agregar en `app/inquilino/mis-datos/page.tsx`:

```tsx
import { GestionUsername } from "@/components/auth/gestion-username"

// ... dentro del componente, cargar el username
const [username, setUsername] = useState<string | null>(null)

useEffect(() => {
  // Cargar datos del perfil
  supabase
    .from("perfiles")
    .select("username")
    .eq("id", user.id)
    .single()
    .then(({ data }) => setUsername(data?.username))
}, [])

// ... en el JSX, agregar después del formulario
<Card className="mt-6">
  <CardHeader>
    <CardTitle>Nombre de Usuario</CardTitle>
  </CardHeader>
  <CardContent>
    <GestionUsername currentUsername={username} />
  </CardContent>
</Card>
```

### Perfil de Administrador
Crear `app/admin/perfil/page.tsx`:

```tsx
import { GestionUsername } from "@/components/auth/gestion-username"
import { GestionCredenciales } from "@/components/auth/gestion-credenciales"

export default function AdminPerfilPage() {
  const [perfil, setPerfil] = useState<any>(null)

  // Cargar datos del perfil...
  // supabase.from("perfiles").select("*").eq("id", user.id).single()

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Perfil de Administrador</h1>

      {/* Información básica */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <p><strong>Email:</strong> {perfil?.email}</p>
          <p><strong>Rol:</strong> Administrador</p>
        </CardContent>
      </Card>

      {/* Gestión de Username */}
      <GestionUsername currentUsername={perfil?.username} />

      {/* Gestión de Email y Contraseña */}
      <GestionCredenciales currentEmail={perfil?.email} />
    </div>
  )
}
```

## Mostrar el Username en la Aplicación

Para mostrar el username en lugar del email en cualquier parte de la app:

```tsx
import { createClient } from "@/lib/supabase/client"

async function obtenerUsername(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("perfiles")
    .select("username, email, nombre")
    .eq("id", userId)
    .single()

  // Usar username si existe, si no usar nombre, si no usar email
  return data?.username || data?.nombre || data?.email
}

// En un componente:
const [nombreMostrar, setNombreMostrar] = useState("")

useEffect(() => {
  obtenerUsername(user.id).then(setNombreMostrar)
}, [])

// Mostrar en la UI:
<p>Bienvenido, {nombreMostrar}</p>
```

## Flujo Completo de Uso

1. **Usuario registrado** (sin username):
   - Inicia sesión con: `lamo9811@gmail.com`
   - En la app se muestra: `lamo9811@gmail.com`

2. **Usuario configura username**:
   - Va a su perfil
   - Hace clic en "Cambiar" en "Nombre de Usuario"
   - Ingresa "Luis"
   - El sistema valida que "Luis" esté disponible
   - Guarda el cambio

3. **Usuario con username - AHORA PUEDE HACER LOGIN CON AMBOS**:
   - ✅ Puede iniciar sesión con: `lamo9811@gmail.com` (su email)
   - ✅ Puede iniciar sesión con: `Luis` (su username)
   - En la app se muestra: `Luis` (su username)

4. **Si el username "Luis" ya existe**:
   - El sistema muestra: "Este nombre de usuario ya está en uso"
   - El usuario debe elegir otro, como: `Luis123`, `Luis_A`, etc.

## Seguridad y Validaciones

1. **Unicidad global**: El username se valida en toda la base de datos
2. **No afecta el login**: El usuario SIEMPRE inicia sesión con su email
3. **Validación en tiempo real**: El usuario sabe inmediatamente si el username está disponible
4. **Sin caracteres peligrosos**: Solo se permiten letras, números, guiones y guiones bajos

## Diferencia con Email

| Característica | Email | Username |
|---------------|-------|----------|
| Para login | ✅ Sí | ✅ **SÍ TAMBIÉN** |
| Se muestra en la app | ❌ No (privacidad) | ✅ Sí |
| Se puede cambiar | ❌ Difícil (requiere verificación) | ✅ Fácil |
| Debe ser único | ✅ Sí | ✅ Sí |
| Formato | `usuario@dominio.com` | `Usuario123` |

## Resumen

- **Email** = Para **login** y **notificaciones** (no cambia)
- **Username** = Para **login** y **mostrar** en la aplicación (puedes cambiarlo cuando quieras)

¡Puedes hacer login con CUALQUIERA de los dos! Ambos funcionan.

## Ejemplo Práctico

```
USUARIO: Luis Arrencibia
├── Email:    lamo9811@gmail.com
├── Username: Luis
└── Contraseña: ********

OPCIONES DE LOGIN (ambas funcionan):
├── Opción 1: lamo9811@gmail.com + ********
└── Opción 2: Luis + ********

LO QUE SE MUESTRA EN LA APP:
└── "Bienvenido, Luis"
```

¡Es como tener un "apodo" o "alias" para tu cuenta que también funciona como usuario!
