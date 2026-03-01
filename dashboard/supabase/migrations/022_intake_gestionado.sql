-- Migration 022: Columna gestionado en arrenlex_form_intake
-- Permite marcar registros como revisados/gestionados por el administrador.
-- El badge del sidebar solo contará registros con gestionado = false.

ALTER TABLE public.arrenlex_form_intake
  ADD COLUMN IF NOT EXISTS gestionado boolean NOT NULL DEFAULT false;
