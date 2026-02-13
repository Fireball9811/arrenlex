# Configurar invitaciones por correo

Para que las invitaciones funcionen, debes configurar las URLs de redirección en Supabase:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. **Authentication** → **URL Configuration**
3. En **Redirect URLs**, agrega:
   - `http://localhost:3000/auth/callback` (desarrollo)
   - `https://tu-dominio.com/auth/callback` (producción cuando la tengas)
4. En **Site URL**, asegúrate de tener `http://localhost:3000` para desarrollo

Sin estas URLs, Supabase rechazará el redirect después de que el usuario haga clic en el enlace del correo.
