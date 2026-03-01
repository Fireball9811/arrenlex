-- Migration 019: Intake de Google Forms (módulo aislado)
-- IMPORTANTE: Esta migración NO modifica ninguna tabla existente.
-- NO agrega FK, triggers ni modifica políticas RLS existentes.

create table if not exists public.arrenlex_form_intake (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  email text,
  telefono text,
  ingresos numeric,
  personas integer,
  ninos integer,
  mascotas integer,
  negocio text,
  fecha_envio timestamp,
  created_at timestamp default now()
);

-- Habilitar RLS (los datos no son visibles públicamente)
alter table public.arrenlex_form_intake enable row level security;

-- Policy: solo permite INSERT desde el rol anon (sin SELECT, sin UPDATE, sin DELETE)
-- Esto permite que el webhook de Google Forms pueda insertar sin autenticación
create policy "anon puede insertar intake"
  on public.arrenlex_form_intake
  for insert
  to anon
  with check (true);
