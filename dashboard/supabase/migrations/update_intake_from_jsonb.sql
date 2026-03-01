-- UPDATE: Poblar columnas individuales desde raw_data (JSONB)
-- Ejecutar DESPUÉS de correr la migración 021.
-- Si una clave no existe en raw_data simplemente queda NULL, sin errores.
-- Si la columna ya tiene valor lo respeta (COALESCE).

UPDATE public.arrenlex_form_intake
SET
  -- Columnas que ya existían
  nombre    = COALESCE(nombre,    raw_data->>'nombre_completo_de_arrendatario'),
  email     = COALESCE(email,     raw_data->>'direcci_n_de_correo_electr_nico'),
  telefono  = COALESCE(telefono,  raw_data->>'telefono_de_contacto_arrendatario'),
  negocio   = COALESCE(negocio,   raw_data->>'la_casa_la_quieren_para_negocio'),

  ingresos  = CASE
    WHEN (raw_data->>'ingresos_mensuales_grupales') ~ '^[0-9]+(\.[0-9]+)?$'
    THEN (raw_data->>'ingresos_mensuales_grupales')::numeric
    ELSE ingresos
  END,

  personas  = CASE
    WHEN (raw_data->>'numero_de_personas_adultas') ~ '^[0-9]+$'
    THEN (raw_data->>'numero_de_personas_adultas')::integer
    ELSE personas
  END,

  ninos     = CASE
    WHEN (raw_data->>'numero_de_ninos') ~ '^[0-9]+$'
    THEN (raw_data->>'numero_de_ninos')::integer
    ELSE ninos
  END,

  mascotas  = CASE
    WHEN (raw_data->>'numero_de_macotas') ~ '^[0-9]+$'
    THEN (raw_data->>'numero_de_macotas')::integer
    ELSE mascotas
  END,

  -- Columnas nuevas (migración 021)
  cedula                                = COALESCE(cedula,                  raw_data->>'cedula_arrendatario'),
  fecha_expedicion_cedula               = COALESCE(fecha_expedicion_cedula, raw_data->>'fecha_de_expedicion_cedula_arrendatario'),
  empresa_arrendatario                  = COALESCE(empresa_arrendatario,    raw_data->>'empresa_donde_labora_arrenadatario'),
  cedula_coarrendatario                 = COALESCE(cedula_coarrendatario,   raw_data->>'cedula_coarrendatario'),
  fecha_expedicion_cedula_coarrendatario = COALESCE(fecha_expedicion_cedula_coarrendatario, raw_data->>'fecha_de_expedicion_cedula_coarrendatario'),
  nombre_coarrendatario                 = COALESCE(nombre_coarrendatario,   raw_data->>'nombre_coarrendatario'),
  empresa_coarrendatario                = COALESCE(empresa_coarrendatario,  raw_data->>'empresa_donde_labora_coarrenadatario'),
  telefono_coarrendatario               = COALESCE(telefono_coarrendatario, raw_data->>'telefono_de_contacto'),
  empresas                              = COALESCE(empresas,                raw_data->>'empresas_donde_trabajan'),
  autorizacion                          = COALESCE(autorizacion,            raw_data->>'autorizo_de_manera_expresa_a_arrenlex_sas_identificada_con_nit_9_0_2_0_3_6_8_7_0_9_como_responsable_del_tratamiento_de_datos_y_o_a_quien_esta_designe_como_encargado_para_verificar_la_informaci_n_suministrada_en_la_presente_solicitud_incluyendo_datos_laborales_ingresos_referencias_personales_y_comerciales_historial_de_arrendamiento_y_de_ser_necesario_consultas_en_centrales_de_riesgo_bases_de_datos_financieras_y_antecedentes_a_trav_s_de_operadores_o_plataformas_legalmente_autorizadas_declaro_que_la_informaci_n_suministrada_es_veraz_y_autorizo_su_validaci_n_nicamente_con_el_prop_sito_de_evaluar_mi_aplicaci_n_de_arrendamiento_entiendo_que_mis_datos_ser_n_tratados_de_manera_confidencial_y_conforme_a_la_normativa_vigente_en_materia_de_protecci_n_de_datos_personales'),

  personas_trabajan = CASE
    WHEN (raw_data->>'personas_que_trabajan') ~ '^[0-9]+$'
    THEN (raw_data->>'personas_que_trabajan')::integer
    ELSE personas_trabajan
  END,

  antiguedad_meses  = CASE
    WHEN (raw_data->>'tiempo_de_antiguedad_en_meses') ~ '^[0-9]+$'
    THEN (raw_data->>'tiempo_de_antiguedad_en_meses')::integer
    ELSE antiguedad_meses
  END,

  antiguedad_meses_2 = CASE
    WHEN (raw_data->>'tiempo_de_antiguedad_en_meses2') ~ '^[0-9]+$'
    THEN (raw_data->>'tiempo_de_antiguedad_en_meses2')::integer
    ELSE antiguedad_meses_2
  END,

  salario   = CASE
    WHEN (raw_data->>'salario') ~ '^[0-9]+(\.[0-9]+)?$'
    THEN (raw_data->>'salario')::numeric
    ELSE salario
  END,

  salario_2 = CASE
    WHEN (raw_data->>'salario_2') ~ '^[0-9]+(\.[0-9]+)?$'
    THEN (raw_data->>'salario_2')::numeric
    ELSE salario_2
  END

WHERE raw_data IS NOT NULL;
