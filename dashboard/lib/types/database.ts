export type Propiedad = {
  id: string
  user_id: string
  direccion: string
  ciudad: string
  barrio: string
  tipo: string
  habitaciones: number
  banos: number
  area: number
  valor_arriendo: number
  descripcion: string
  estado: "disponible" | "arrendado" | "mantenimiento"
  // Nuevos campos para contratos
  matricula_inmobiliaria?: string | null
  cuenta_bancaria_entidad?: string | null
  cuenta_bancaria_tipo?: string | null
  cuenta_bancaria_numero?: string | null
  cuenta_bancaria_titular?: string | null
  created_at: string
}

export type Arrendatario = {
  id: string
  user_id: string
  nombre: string
  cedula: string
  telefono: string
  // Nuevos campos para contratos
  cedula_ciudad_expedicion?: string | null
  direccion_residencia?: string | null
  email?: string | null
  celular?: string | null
  deudor_solidario_nombre?: string | null
  deudor_solidario_cedula?: string | null
  deudor_solidario_cedula_expedicion?: string | null
  deudor_solidario_direccion?: string | null
  deudor_solidario_email?: string | null
  deudor_solidario_celular?: string | null
  // Otros campos existentes
  coarrendatario_nombre?: string | null
  coarrendatario_cedula?: string | null
  coarrendatario_telefono?: string | null
  salario_principal?: number | null
  salario_secundario?: number | null
  empresa_principal?: string | null
  empresa_secundaria?: string | null
  tiempo_servicio_principal?: string | null
  tiempo_servicio_secundario?: string | null
  ref_familiar_1_nombre?: string | null
  ref_familiar_1_parentesco?: string | null
  ref_familiar_2_nombre?: string | null
  ref_familiar_2_parentesco?: string | null
  ref_personal_1_nombre?: string | null
  ref_personal_1_cedula?: string | null
  ref_personal_1_telefono?: string | null
  ref_personal_2_nombre?: string | null
  ref_personal_2_cedula?: string | null
  ref_personal_2_telefono?: string | null
  adultos_habitantes?: number | null
  ninos_habitantes?: number | null
  mascotas_cantidad?: number | null
  vehiculos_cantidad?: number | null
  vehiculos_placas?: string | null
  autorizacion_datos?: boolean | null
  created_at: string
}

export type Perfil = {
  id: string
  email: string
  nombre?: string | null
  role: "admin" | "propietario" | "inquilino"
  activo: boolean
  bloqueado: boolean
  creado_en: string
  actualizado_en: string
}

export type Contrato = {
  id: string
  user_id: string
  propiedad_id: string
  arrendatario_id: string
  fecha_inicio: string // Date
  duracion_meses: number
  fecha_fin: string // Date (calculated)
  canon_mensual: number
  ciudad_firma: string
  estado: "borrador" | "activo" | "terminado" | "vencido"
  created_at: string
  updated_at: string
}

// Tipo expandido con relaciones para mostrar en la UI
export type ContratoConRelaciones = Contrato & {
  propiedad: {
    direccion: string
    ciudad: string
    barrio: string
    matricula_inmobiliaria?: string | null
  }
  arrendatario: {
    nombre: string
    cedula: string
    email?: string | null
    celular?: string | null
  }
  propietario: {
    nombre: string | null
    email: string
  }
}

// Tipo para crear un nuevo contrato
export type ContratoCrear = {
  propiedad_id: string
  arrendatario_id: string
  fecha_inicio: string // YYYY-MM-DD
  duracion_meses: number
  canon_mensual: number
  ciudad_firma: string
}

// Tipo para datos del contrato (para generación de PDF)
export type DatosContrato = {
  // Arrendatario
  arrendatario_nombre: string
  arrendatario_cedula: string
  arrendatario_cedula_expedicion: string | null
  arrendatario_direccion: string | null
  arrendatario_email: string | null
  arrendatario_celular: string | null

  // Deudor solidario
  deudor_solidario_nombre: string | null
  deudor_solidario_cedula: string | null
  deudor_solidario_cedula_expedicion: string | null
  deudor_solidario_direccion: string | null
  deudor_solidario_email: string | null
  deudor_solidario_celular: string | null

  // Propietario
  propietario_nombre: string | null
  propietario_email: string
  propietario_cedula: string | null

  // Propiedad
  propiedad_direccion: string
  propiedad_ciudad: string
  propiedad_barrio: string
  propiedad_matricula: string | null
  propiedad_cuenta_entidad: string | null
  propiedad_cuenta_tipo: string | null
  propiedad_cuenta_numero: string | null
  propiedad_cuenta_titular: string | null

  // Contrato
  contrato_fecha_inicio: string
  contrato_duracion_meses: number
  contrato_fecha_fin: string
  contrato_canon_mensual: number
  contrato_ciudad_firma: string
}

export type PropiedadImagen = {
  id: string
  propiedad_id: string
  categoria: "sala" | "cocina" | "habitacion" | "bano" | "fachada" | "otra"
  nombre_archivo: string
  url_publica: string
  orden: number
  created_at: string
}

export type PropiedadConImagenes = Propiedad & {
  imagenes?: PropiedadImagen[]
}

export type CiudadDisponible = {
  ciudad: string
}
