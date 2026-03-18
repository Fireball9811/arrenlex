-- Renombrar columnas en arrenlex_form_intake para coincidir con arrendatarios
-- Esto simplifica el mapeo al pasar de intake a arrendatarios

-- Datos del arrendatario principal
ALTER TABLE arrenlex_form_intake
  RENAME COLUMN fecha_expedicion_cedula TO cedula_ciudad_expedicion;

-- Datos familiares/habitantes
ALTER TABLE arrenlex_form_intake
  RENAME COLUMN personas TO adultos_habitantes;

ALTER TABLE arrenlex_form_intake
  RENAME COLUMN ninos TO ninos_habitantes;

ALTER TABLE arrenlex_form_intake
  RENAME COLUMN mascotas TO mascotas_cantidad;

-- Datos salariales
ALTER TABLE arrenlex_form_intake
  RENAME COLUMN salario TO salario_principal;

ALTER TABLE arrenlex_form_intake
  RENAME COLUMN salario_2 TO salario_secundario;

-- Datos laborales
ALTER TABLE arrenlex_form_intake
  RENAME COLUMN empresa_arrendatario TO empresa_principal;

ALTER TABLE arrenlex_form_intake
  RENAME COLUMN empresa_coarrendatario TO empresa_secundaria;

ALTER TABLE arrenlex_form_intake
  RENAME COLUMN antiguedad_meses TO tiempo_servicio_principal_meses;

ALTER TABLE arrenlex_form_intake
  RENAME COLUMN antiguedad_meses_2 TO tiempo_servicio_secundario_meses;

-- Datos del coarrendatario
ALTER TABLE arrenlex_form_intake
  RENAME COLUMN nombre_coarrendatario TO coarrendatario_nombre;

ALTER TABLE arrenlex_form_intake
  RENAME COLUMN cedula_coarrendatario TO coarrendatario_cedula;

ALTER TABLE arrenlex_form_intake
  RENAME COLUMN telefono_coarrendatario TO coarrendatario_telefono;

ALTER TABLE arrenlex_form_intake
  RENAME COLUMN fecha_expedicion_cedula_coarrendatario TO coarrendatario_cedula_expedicion;
