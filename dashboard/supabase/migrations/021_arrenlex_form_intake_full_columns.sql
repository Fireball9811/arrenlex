-- Migration 021: Columnas completas del formulario de arrendamiento
-- Agrega las 15 columnas faltantes a la tabla arrenlex_form_intake.
-- Usa IF NOT EXISTS: es seguro correrlo varias veces sin errores.
-- NO modifica ninguna tabla existente del sistema.

alter table public.arrenlex_form_intake
  add column if not exists cedula                               text,
  add column if not exists fecha_expedicion_cedula              text,
  add column if not exists personas_trabajan                    integer,
  add column if not exists empresas                             text,
  add column if not exists autorizacion                         text,
  add column if not exists empresa_arrendatario                 text,
  add column if not exists cedula_coarrendatario                text,
  add column if not exists fecha_expedicion_cedula_coarrendatario text,
  add column if not exists nombre_coarrendatario                text,
  add column if not exists empresa_coarrendatario               text,
  add column if not exists antiguedad_meses                     integer,
  add column if not exists antiguedad_meses_2                   integer,
  add column if not exists salario                              numeric,
  add column if not exists salario_2                            numeric,
  add column if not exists telefono_coarrendatario              text;
