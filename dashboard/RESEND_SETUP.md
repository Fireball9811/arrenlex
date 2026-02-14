# Configurar Resend para enviar correos

Resend se usa para enviar invitaciones (contraseña temporal) y correos de recuperar contraseña.

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
2. Pega la API key en la línea `RESEND_API_KEY=`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Guarda el archivo
4. Reinicia el servidor (`npm run dev`)

## Correo de prueba (desarrollo)

Por defecto se usa `onboarding@resend.dev` para enviar. Resend permite usarlo sin verificar dominio para pruebas (límite: 100 correos/día).

## Producción

Para producción, verifica tu dominio en Resend (Domains) y cambia `RESEND_FROM_EMAIL`:
```
RESEND_FROM_EMAIL=Arrenlex <noreply@tudominio.com>
```
