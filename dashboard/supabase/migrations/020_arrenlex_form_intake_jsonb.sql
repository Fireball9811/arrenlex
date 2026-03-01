-- Migration 020: Agregar columna JSONB al intake de Google Forms
-- Esta migración agrega raw_data a la tabla existente sin tocar columnas anteriores.
-- Las columnas anteriores se mantienen para compatibilidad.

alter table public.arrenlex_form_intake
  add column if not exists raw_data jsonb;
