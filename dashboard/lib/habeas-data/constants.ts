export const TIPO_SOLICITUD_VALUES = [
  "consulta",
  "actualizacion",
  "rectificacion",
  "supresion",
  "revocatoria",
  "prueba_autorizacion",
  "informacion_uso_datos",
  "otro",
] as const

export const ESTADO_VALUES = [
  "recibido",
  "en_revision",
  "pendiente_informacion",
  "respondido",
  "cerrado",
  "rechazado",
] as const

export type TipoSolicitudHabeas = (typeof TIPO_SOLICITUD_VALUES)[number]
export type EstadoHabeas = (typeof ESTADO_VALUES)[number]

export const TIPO_SOLICITUD_LABELS: Record<TipoSolicitudHabeas, string> = {
  consulta: "Consulta",
  actualizacion: "Actualización",
  rectificacion: "Rectificación",
  supresion: "Supresión",
  revocatoria: "Revocatoria",
  prueba_autorizacion: "Prueba de autorización",
  informacion_uso_datos: "Información sobre uso de datos",
  otro: "Otro",
}

export const ESTADO_LABELS: Record<EstadoHabeas, string> = {
  recibido: "Recibido",
  en_revision: "En revisión",
  pendiente_informacion: "Pendiente información",
  respondido: "Respondido",
  cerrado: "Cerrado",
  rechazado: "Rechazado",
}

/** Origen de la solicitud Habeas Data (campo `origen`). */
export const ORIGEN_VALUES = ["correo", "formulario", "telefono", "presencial", "otro"] as const

export type OrigenHabeas = (typeof ORIGEN_VALUES)[number]

export const ORIGEN_LABELS: Record<OrigenHabeas, string> = {
  correo: "Correo",
  formulario: "Formulario",
  telefono: "Teléfono",
  presencial: "Presencial",
  otro: "Otro",
}

/** Estados permitidos al responder por correo (no incluye recibido/en_revision). */
export const RESPONDER_ESTADO_FINAL_VALUES = [
  "respondido",
  "pendiente_informacion",
  "cerrado",
  "rechazado",
] as const

export type ResponderEstadoFinal = (typeof RESPONDER_ESTADO_FINAL_VALUES)[number]

export const RESPONDER_ESTADO_FINAL_LABELS: Record<ResponderEstadoFinal, string> = {
  respondido: "Respondido",
  pendiente_informacion: "Pendiente información",
  cerrado: "Cerrado",
  rechazado: "Rechazado",
}
