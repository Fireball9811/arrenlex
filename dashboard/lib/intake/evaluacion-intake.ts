import type { IntakeFormulario } from "@/lib/types/database"

export type UnidadEvaluacion = {
  /** Identificador estable: grupo_solicitud_id o id del registro solitario */
  unidadId: string
  registroBase: IntakeFormulario
  /** Registro fusionado listo para calcularScore (como el formulario antiguo) */
  registroParaScore: IntakeFormulario
  miembros: IntakeFormulario[]
  idsMiembros: string[]
  esPareja: boolean
  /** Hay enlace de pareja pero falta el otro formulario en BD */
  parejaIncompleta: boolean
  etiqueta: string
}

function num(v: number | null | undefined): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : 0
}

function salarioRegistro(r: IntakeFormulario): number {
  return num(r.salario_principal ?? r.salario)
}

export function obtenerParejaGrupo(
  reg: IntakeFormulario,
  todos: IntakeFormulario[]
): IntakeFormulario | null {
  const grupo = reg.grupo_solicitud_id?.trim()
  if (!grupo) return null
  return (
    todos.find(
      (o) =>
        o.id !== reg.id &&
        o.grupo_solicitud_id?.trim() === grupo &&
        (o.propiedad_id ?? "") === (reg.propiedad_id ?? "")
    ) ?? null
  )
}

function esCoarrendatario(r: IntakeFormulario): boolean {
  return (r.tipo_solicitante ?? "").trim().toLowerCase() === "coarrendatario"
}

function esPrincipal(r: IntakeFormulario): boolean {
  const t = (r.tipo_solicitante ?? "").trim().toLowerCase()
  return t === "" || t === "arrendatario_principal"
}

function ordenPrincipalCoarrendatario(
  a: IntakeFormulario,
  b: IntakeFormulario
): { principal: IntakeFormulario; coarrendatario: IntakeFormulario } {
  if (esPrincipal(a) && esCoarrendatario(b)) return { principal: a, coarrendatario: b }
  if (esPrincipal(b) && esCoarrendatario(a)) return { principal: b, coarrendatario: a }
  if (esCoarrendatario(a)) return { principal: b, coarrendatario: a }
  if (esCoarrendatario(b)) return { principal: a, coarrendatario: b }
  return new Date(a.created_at).getTime() <= new Date(b.created_at).getTime()
    ? { principal: a, coarrendatario: b }
    : { principal: b, coarrendatario: a }
}

/** Fusiona dos filas del mismo grupo en un registro virtual (modelo formulario antiguo). */
export function fusionarRegistrosGrupo(
  a: IntakeFormulario,
  b: IntakeFormulario
): IntakeFormulario {
  const { principal, coarrendatario } = ordenPrincipalCoarrendatario(a, b)
  const salPrin = salarioRegistro(principal)
  const salCo = salarioRegistro(coarrendatario)
  const adultosPrin = num(principal.adultos_habitantes ?? principal.personas)
  const adultosCo = num(coarrendatario.adultos_habitantes ?? coarrendatario.personas)
  const adultos = Math.max(adultosPrin, adultosCo, 1)
  const trabPrin = num(principal.personas_trabajan) || 1
  const trabCo = salCo > 0 ? Math.max(num(coarrendatario.personas_trabajan), 1) : 0
  const personasTrabajan = Math.min(adultos, trabPrin + (trabCo > 0 ? 1 : 0))

  const rechazos = [
    ...(principal.rechazos_previos ?? []),
    ...(coarrendatario.rechazos_previos ?? []),
  ].filter((rp, i, arr) => arr.findIndex((x) => x.id === rp.id) === i)

  return {
    ...principal,
    salario_principal: salPrin || principal.salario_principal,
    salario: salPrin || principal.salario,
    salario_secundario: salCo,
    salario_2: salCo,
    ingresos: salPrin + salCo,
    coarrendatario_nombre: coarrendatario.nombre,
    nombre_coarrendatario: coarrendatario.nombre,
    coarrendatario_cedula: coarrendatario.cedula,
    cedula_coarrendatario: coarrendatario.cedula,
    coarrendatario_telefono: coarrendatario.telefono,
    telefono_coarrendatario: coarrendatario.telefono,
    coarrendatario_email: coarrendatario.email,
    coarrendatario_cedula_expedicion:
      coarrendatario.cedula_ciudad_expedicion ?? coarrendatario.fecha_expedicion_cedula,
    fecha_expedicion_cedula_coarrendatario:
      coarrendatario.cedula_ciudad_expedicion ?? coarrendatario.fecha_expedicion_cedula,
    empresa_secundaria: coarrendatario.empresa_principal ?? coarrendatario.empresa_arrendatario,
    empresa_coarrendatario: coarrendatario.empresa_principal ?? coarrendatario.empresa_arrendatario,
    tiempo_servicio_secundario_meses:
      coarrendatario.tiempo_servicio_principal_meses ?? coarrendatario.antiguedad_meses,
    antiguedad_meses_2: coarrendatario.tiempo_servicio_principal_meses ?? coarrendatario.antiguedad_meses,
    adultos_habitantes: adultos,
    personas: adultos,
    ninos_habitantes: Math.max(
      num(principal.ninos_habitantes ?? principal.ninos),
      num(coarrendatario.ninos_habitantes ?? coarrendatario.ninos)
    ),
    ninos: Math.max(
      num(principal.ninos_habitantes ?? principal.ninos),
      num(coarrendatario.ninos_habitantes ?? coarrendatario.ninos)
    ),
    mascotas_cantidad: Math.max(
      num(principal.mascotas_cantidad ?? principal.mascotas),
      num(coarrendatario.mascotas_cantidad ?? coarrendatario.mascotas)
    ),
    mascotas: Math.max(
      num(principal.mascotas_cantidad ?? principal.mascotas),
      num(coarrendatario.mascotas_cantidad ?? coarrendatario.mascotas)
    ),
    personas_trabajan: personasTrabajan,
    unico_arrendatario: false,
    rechazos_previos: rechazos,
  }
}

/** Registro listo para scoring: fusiona pareja del mismo grupo si existe en BD. */
export function buildRegistroParaScore(
  reg: IntakeFormulario,
  todos: IntakeFormulario[]
): IntakeFormulario {
  const pareja = obtenerParejaGrupo(reg, todos)
  if (!pareja) return reg
  return fusionarRegistrosGrupo(reg, pareja)
}

export function ingresosHogar(reg: IntakeFormulario, todos: IntakeFormulario[]): number {
  const merged = buildRegistroParaScore(reg, todos)
  return num(merged.salario_principal ?? merged.salario) + num(merged.salario_secundario ?? merged.salario_2)
}

function etiquetaUnidad(miembros: IntakeFormulario[], esPareja: boolean): string {
  if (!esPareja || miembros.length < 2) return miembros[0]?.nombre ?? "—"
  const { principal, coarrendatario } = ordenPrincipalCoarrendatario(miembros[0], miembros[1])
  const p = principal.nombre ?? "Principal"
  const c = coarrendatario.nombre ?? "Codeudor"
  return `${p} + ${c}`
}

export function construirUnidadEvaluacion(
  reg: IntakeFormulario,
  todos: IntakeFormulario[]
): UnidadEvaluacion {
  const pareja = obtenerParejaGrupo(reg, todos)
  const grupo = reg.grupo_solicitud_id?.trim()
  const esPareja = !!pareja
  const miembros = pareja ? [reg, pareja] : [reg]
  const idsMiembros = miembros.map((m) => m.id).sort()
  const unidadId = grupo || reg.id
  const parejaIncompleta = !!grupo && !pareja

  return {
    unidadId,
    registroBase: esPrincipal(reg) || !pareja ? reg : pareja,
    registroParaScore: pareja ? fusionarRegistrosGrupo(reg, pareja) : reg,
    miembros,
    idsMiembros,
    esPareja,
    parejaIncompleta,
    etiqueta: etiquetaUnidad(miembros, esPareja),
  }
}

/** Colapsa filas seleccionadas en unidades de evaluación (pareja = 1 unidad). */
export function unidadesDesdeSeleccion(
  seleccionados: Set<string>,
  todos: IntakeFormulario[]
): UnidadEvaluacion[] {
  const map = new Map<string, UnidadEvaluacion>()
  for (const id of seleccionados) {
    const reg = todos.find((r) => r.id === id)
    if (!reg) continue
    const unidad = construirUnidadEvaluacion(reg, todos)
    if (!map.has(unidad.unidadId)) {
      map.set(unidad.unidadId, unidad)
    }
  }
  return [...map.values()]
}

export type AnalisisSeleccion = {
  unidades: UnidadEvaluacion[]
  puedeCalificar: boolean
  puedeComparar: boolean
  motivoCalificacion: string
  motivoComparacion: string
}

export function analizarSeleccion(
  seleccionados: Set<string>,
  todos: IntakeFormulario[],
  mensajes: {
    sinSeleccion: string
    compararMinUnidades: string
    compararMismaPropiedad: string
    parejaIncompleta: string
  }
): AnalisisSeleccion {
  const unidades = unidadesDesdeSeleccion(seleccionados, todos)

  if (unidades.length === 0) {
    return {
      unidades: [],
      puedeCalificar: false,
      puedeComparar: false,
      motivoCalificacion: mensajes.sinSeleccion,
      motivoComparacion: mensajes.sinSeleccion,
    }
  }

  const propiedadIds = [...new Set(unidades.map((u) => u.registroBase.propiedad_id ?? "__sin__"))]
  const parejaIncompleta = unidades.some((u) => u.parejaIncompleta)

  let puedeComparar = unidades.length >= 2
  let motivoComparacion = ""

  if (propiedadIds.length > 1 || propiedadIds[0] === "__sin__") {
    puedeComparar = false
    motivoComparacion = mensajes.compararMismaPropiedad
  } else if (unidades.length < 2) {
    puedeComparar = false
    motivoComparacion = mensajes.compararMinUnidades
  }

  const puedeCalificar = unidades.length >= 1
  const motivoCalificacion = parejaIncompleta ? mensajes.parejaIncompleta : ""

  return {
    unidades,
    puedeCalificar,
    puedeComparar,
    motivoCalificacion,
    motivoComparacion,
  }
}
