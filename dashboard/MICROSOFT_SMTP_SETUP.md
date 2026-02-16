# Configurar Microsoft 365 SMTP para Arrenlex

Esta guía explica cómo configurar Microsoft 365 Business (dominio propio) para enviar correos (invitaciones, restablecer contraseña, solicitudes de visita y mantenimiento) usando SMTP estándar con STARTTLS. No se usa Gmail ni OAuth.

---

## 1. Contraseña para SMTP

- Si la cuenta (ej. **ceo@arrenlex.com**) tiene **MFA activado**: crea una **contraseña de aplicación** en [account.microsoft.com/security](https://account.microsoft.com/security) → **Seguridad avanzada** → **Contraseñas de aplicación** (ej. nombre "Arrenlex") y usa esa contraseña en `SMTP_PASS`.
- Si **no tiene MFA**: usa la **contraseña normal** de la cuenta en `SMTP_PASS`.

Guarda ese valor; lo pondrás en `SMTP_PASS` en `.env.local`.

---

## 2. Configurar `.env.local`

En `dashboard/.env.local`:

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=ceo@arrenlex.com
SMTP_PASS='tu_contraseña_o_contraseña_de_aplicacion'
EMAIL_FROM=ceo@arrenlex.com
```

- **SMTP_USER**: tu correo Microsoft 365 (mismo que usas para iniciar sesión).
- **SMTP_PASS**: usa **comillas simples** si la contraseña tiene `#`, `$` o `&` (ej. `SMTP_PASS='pass$con#signos'`). Si sigue fallando, usa `SMTP_PASS_B64` con el valor en base64: `node -e "console.log(Buffer.from('tupass').toString('base64'))"`.
- **EMAIL_FROM**: mismo correo que SMTP_USER.

**Reglas:**
- No usar `smtp.gmail.com` ni configuraciones de Google.
- No usar contraseñas OAuth.
- Solo autenticación SMTP estándar con STARTTLS.

---

## 3. Reiniciar el servidor

Tras cambiar `.env.local`:

```bash
# Detén el servidor (Ctrl+C) y arranca de nuevo
npm run dev
```

---

## Diagnóstico: probar SMTP

Desde la carpeta `dashboard`:

```bash
node scripts/test-smtp.js
```

Este script verifica la conexión y envía un correo de prueba a tu cuenta. Si falla, mostrará el error exacto.

---

## Solución de problemas (los correos no llegan)

1. **Reiniciar el servidor** tras cambiar `.env.local`:
   - Detén `npm run dev` (Ctrl+C) y arranca de nuevo.
   - Next.js carga las variables al iniciar; si las cambiaste, el servidor sigue usando las antiguas.

2. **Revisar carpeta de spam**: Los correos de Microsoft 365 a veces van a spam en la primera vez.

3. **SMTP AUTH deshabilitado**: En Microsoft 365 Admin → Usuarios → [tu usuario] → Correo → Autenticación SMTP. Debe estar habilitada.

4. **MFA activo**: Si tienes 2FA, usa una **contraseña de aplicación** (no la contraseña normal) en `SMTP_PASS` o `SMTP_PASS_B64`.

5. **Caracteres especiales en contraseña**: Si la contraseña tiene `#`, `$` o `&`, usa `SMTP_PASS_B64` con el valor en base64:
   ```bash
   node -e "console.log(Buffer.from('tu-contraseña-aqui').toString('base64'))"
   ```

---

## Notas

- **Microsoft 365 Business**: si el admin tiene deshabilitado SMTP AUTH para la cuenta, debe habilitarlo en el centro de administración.
- **ADMIN_EMAILS**: si usas esa variable para controlar quién es administrador, incluye el mismo correo (ej. `ceo@arrenlex.com`).
