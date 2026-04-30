-- Período de canon obligatorio solo para tipo "arriendo"; otros pagos pueden omitir fechas.
-- Incluye "deposito" en tipo_pago (ya usado en el formulario web).

ALTER TABLE recibos_pago
  ALTER COLUMN fecha_inicio_periodo DROP NOT NULL,
  ALTER COLUMN fecha_fin_periodo DROP NOT NULL;

ALTER TABLE recibos_pago DROP CONSTRAINT IF EXISTS recibos_pago_tipo_pago_check;

ALTER TABLE recibos_pago ADD CONSTRAINT recibos_pago_tipo_pago_check
  CHECK (tipo_pago IN ('arriendo', 'servicios', 'otro', 'deposito'));

COMMENT ON COLUMN recibos_pago.fecha_inicio_periodo IS 'Inicio del período cancelado (obligatorio si tipo_pago = arriendo; opcional en otros)';
COMMENT ON COLUMN recibos_pago.fecha_fin_periodo IS 'Fin del período cancelado (obligatorio si tipo_pago = arriendo; opcional en otros)';

ALTER TABLE recibos_pago ADD CONSTRAINT recibos_pago_periodo_si_arriendo CHECK (
  tipo_pago <> 'arriendo'
  OR (fecha_inicio_periodo IS NOT NULL AND fecha_fin_periodo IS NOT NULL)
);
