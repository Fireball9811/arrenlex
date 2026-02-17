# Configurar Resend para enviar correos

El dashboard usa **Resend** para todo el envío de correos: invitaciones (contraseña temporal), recuperar contraseña, solicitudes de visita y solicitudes de mantenimiento. **No se usa Gmail ni Microsoft** ni contraseñas de aplicación.

## Crear la API key en Resend

1. Entra en [resend.com](https://resend.com)
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys** (en el menú lateral o en [resend.com/api-keys](https://resend.com/api-keys))
4. Haz clic en **Create API Key**
5. Pon un nombre (ej: `arrenlex-local`)
6. Selecciona permiso **Sending access**
7. Haz clic en **Add**
8. Copia la API key (empieza por `re_`). Solo se muestra una vez

## Configurar en el proyecto

1. Abre `dashboard/.env.local`
2. Añade o edita:
   ```
   RESEND_API_KEY=re_re_BsNpCjJ6_78FsDzWRchnvyjvSSFTkPie5
   EMAIL_FROM=Arrenlex <noreply@arrenlex.com>
   ```
3. Guarda el archivo
4. Reinicia el servidor (`npm run dev`)

## Dominio verificado (arrenlex.com)

Si en Resend → Domains tu dominio **arrenlex.com** está en estado **Verified**, puedes enviar desde ese dominio. Usa en `.env.local`:

```
EMAIL_FROM=Arrenlex <noreply@arrenlex.com>
```

(o cualquier dirección @arrenlex.com que tengas configurada en Resend).

## Pruebas sin dominio verificado

Si aún no has verificado el dominio, Resend permite enviar desde `onboarding@resend.dev` (límite: 100 correos/día):

```
EMAIL_FROM=Arrenlex <onboarding@resend.dev>
```

## Probar el envío

Desde la carpeta `dashboard`:

```bash
node scripts/test-resend.js
```

Requiere `RESEND_API_KEY` en `.env.local`. El script envía un correo de prueba al destinatario configurado.

## Producción (Vercel)

El archivo `.env.local` **no se usa en producción**. No se despliega a Vercel (está en `.gitignore`). Las variables deben configurarse en el panel de Vercel.

### Variables a configurar en Vercel

1. Entra en [vercel.com](https://vercel.com) → tu proyecto → **Settings** → **Environment Variables**
2. Añade o edita estas variables:

| Variable | Valor | Environments |
|----------|-------|--------------|
| `RESEND_API_KEY` | Tu API key de Resend (empieza por `re_`) | Production, Preview |
| `EMAIL_FROM` | `Arrenlex <noreply@arrenlex.com>` | Production, Preview |
| `NEXT_PUBLIC_SITE_URL` | `https://www.arrenlex.com` | Production, Preview |

- Para `EMAIL_FROM` usa el valor exacto incluyendo espacios y los caracteres `<` `>`
- Marca **Production** y **Preview** en Environments
- No marques **Expose to Browser** para `RESEND_API_KEY` (es secreta)

### Redeploy

Tras guardar las variables:

1. **Deployments** → último deployment → menú (tres puntos) → **Redeploy**
2. Confirma el redeploy

Vercel no aplica variables nuevas hasta que se hace redeploy.

### Probar en producción

1. Ve a https://www.arrenlex.com/invitaciones
2. Envía una invitación a un correo tuyo
3. Revisa bandeja de entrada y carpeta de spam
