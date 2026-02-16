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
