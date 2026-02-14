# Configurar Gmail SMTP para Arrenlex

Esta guía explica cómo configurar Gmail para enviar correos (invitaciones y restablecer contraseña) sin restricciones de dominio ni destinatarios.

---

## 1. Activar verificación en dos pasos (2FA)

Google exige 2FA para usar contraseñas de aplicación.

1. Ve a [Google Cuenta](https://myaccount.google.com/)
2. **Seguridad** → **Verificación en dos pasos** → Activar

---

## 2. Crear contraseña de aplicación

1. En [Google Cuenta](https://myaccount.google.com/) → **Seguridad**
2. Busca **"Contraseñas de aplicaciones"** (o [directo](https://myaccount.google.com/apppasswords))
3. Si no aparece, asegúrate de tener 2FA activado
4. **Seleccionar app**: elige "Correo"
5. **Seleccionar dispositivo**: "Otro (nombre personalizado)" → escribe "Arrenlex"
6. Pulsa **Generar**
7. Copia la contraseña de 16 caracteres (formato: `xxxx xxxx xxxx xxxx`)

---

## 3. Configurar `.env.local`

En `dashboard/.env.local`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=Arrenlex <tu-correo@gmail.com>
```

- **SMTP_USER**: tu correo de Gmail (el mismo de la cuenta)
- **SMTP_PASS**: la contraseña de aplicación generada en el paso 2
- **EMAIL_FROM**: nombre visible y correo del remitente (usa tu Gmail en el correo)

---

## 4. Reiniciar el servidor

Tras cambiar `.env.local`:

```bash
# Detén el servidor (Ctrl+C) y arranca de nuevo
npm run dev
```

---

## Notas

- **Sin restricciones**: Gmail permite enviar a cualquier correo (no hay sandbox como Resend)
- **Invitaciones repetidas**: puedes invitar o re-invitar al mismo correo sin límite
- **Usuarios existentes**: si el correo ya está registrado, se actualiza la contraseña temporal y se reenvía el correo
- **Límite diario**: Gmail tiene un límite de ~500 correos/día para cuentas normales; suficiente para uso interno
