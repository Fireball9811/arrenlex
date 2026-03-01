# Módulo de Intake – Google Forms → Arrenlex

Módulo aislado que recibe submissions de Google Forms y los almacena en Supabase.
No modifica ninguna tabla, lógica ni política existente del sistema.

---

## Archivos

```
app/api/intake/
  google-forms/route.ts   → Endpoint webhook (POST /api/intake/google-forms)
  google-apps-script.js   → Script para pegar en el Google Form
  README.md               → Este archivo
supabase/migrations/
  019_arrenlex_form_intake.sql → Migración de la tabla en Supabase
```

---

## Paso 1: Ejecutar la migración en Supabase

1. Ve a tu proyecto en https://supabase.com
2. Click en **SQL Editor** (menú izquierdo)
3. Click en **New query**
4. Copia y pega el contenido de `019_arrenlex_form_intake.sql`
5. Click en **Run** (o `Ctrl+Enter`)
6. Deberías ver: `Success. No rows returned`

Verifica que la tabla existe:
- Ve a **Table Editor** → busca `arrenlex_form_intake`
- Ve a **Authentication → Policies** → verifica la policy `anon puede insertar intake`

---

## Paso 2: Configurar el Google Form

Crea el formulario con estas preguntas (en este orden):

| # | Pregunta | Tipo |
|---|----------|------|
| 1 | Nombre completo | Respuesta corta |
| 2 | Email | Respuesta corta |
| 3 | Teléfono | Respuesta corta |
| 4 | Ingresos mensuales | Respuesta corta (número) |
| 5 | Número de personas que vivirán | Respuesta corta (número) |
| 6 | Número de niños | Respuesta corta (número) |
| 7 | ¿Tiene mascotas? ¿Cuántas? | Respuesta corta |
| 8 | Actividad económica / negocio | Párrafo |

---

## Paso 3: Conectar el Google Form con el webhook

1. Abre el Google Form
2. Click en los **tres puntos (⋮)** arriba a la derecha → **Editor de secuencias de comandos**
3. Borra todo el contenido del editor
4. Pega el contenido de `google-apps-script.js`
5. En la línea `var WEBHOOK_URL = "..."`, reemplaza con tu URL real:
   ```
   https://arrenlex.vercel.app/api/intake/google-forms
   ```
6. Guarda con `Ctrl+S`
7. Ve al ícono del **reloj** (Activadores / Triggers)
8. Click en **Agregar activador** (abajo a la derecha)
9. Configura así:
   - Función: `onFormSubmit`
   - Fuente: `Del formulario`
   - Tipo de evento: `Al enviar el formulario`
10. Guarda y autoriza los permisos

---

## Paso 4: Probar la conexión

1. Abre el Google Form en modo preview
2. Llena todas las preguntas y envía
3. Ve a Supabase → **Table Editor** → `arrenlex_form_intake`
4. Deberías ver el registro recién insertado

También puedes verificar en Apps Script:
- Ve al **Editor de secuencias de comandos**
- Click en **Ver → Registros de ejecución**
- Deberías ver: `Enviado correctamente a Arrenlex.`

---

## Notas de seguridad

- La tabla tiene RLS activado: `anon` solo puede hacer INSERT
- Nadie puede leer los datos desde el exterior
- Solo el service role (Supabase dashboard) puede consultar la tabla
- En el futuro se puede agregar un header secreto para mayor seguridad
