"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, ClipboardList } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type PropiedadInfo = {
  id: string
  ciudad: string | null
  area: number
  valor_arriendo: number
  descripcion: string | null
  /** Metadatos del token (respuesta aplicacion-info) */
  grupo_solicitud_id?: string | null
  tipo_solicitante?: "arrendatario_principal" | "coarrendatario"
}

type FormData = {
  // Paso 1 — Arrendatario
  nombre: string
  email: string
  tipo_documento: string
  cedula: string
  fecha_expedicion_cedula: string
  telefono: string
  // Paso 2 — Laboral arrendatario
  empresa_arrendatario: string
  antiguedad_meses: string
  salario: string
  ingresos: string
  // Paso 3 — Hogar y autorización
  personas: string
  ninos: string
  mascotas: string
  personas_trabajan: string
  negocio: string
  fecha_ingreso_deseada: string
  autorizacion_aceptada: boolean
}

const INITIAL_FORM: FormData = {
  nombre: "",
  email: "",
  tipo_documento: "CC",
  cedula: "",
  fecha_expedicion_cedula: "",
  telefono: "",
  empresa_arrendatario: "",
  antiguedad_meses: "",
  salario: "",
  ingresos: "",
  personas: "",
  ninos: "",
  mascotas: "",
  personas_trabajan: "",
  negocio: "",
  fecha_ingreso_deseada: "",
  autorizacion_aceptada: false,
}

const TOTAL_STEPS = 3

const PASO_TITULOS = ["Información personal", "Situación laboral", "Tu hogar"]
const OPCIONES_TIPO_DOCUMENTO = [
  { value: "CC", label: "CC (Cédula de ciudadanía)" },
  { value: "CE", label: "CE (Cédula de Extranjería)" },
  { value: "INT", label: "INT (Internacional)" },
  { value: "NIT", label: "NIT (Número de Identificación Tributaria)" },
  { value: "PP", label: "PP (Pasaporte)" },
  { value: "PPT", label: "PPT (Permiso por Protección Temporal)" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

// Validación de email — regex alineada con el backend
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function isEmailValido(email: string): boolean {
  const v = email.trim()
  if (!v) return false
  return EMAIL_REGEX.test(v)
}

// Validación de salario: numéricamente debe ser >= 1.000.000 (7 cifras)
function isSalarioValido(salario: string): boolean {
  if (!salario.trim()) return false
  const soloDigitos = salario.replace(/\D/g, "")
  if (soloDigitos.length < 7) return false
  const numero = Number(soloDigitos)
  return Number.isFinite(numero) && numero >= 1_000_000
}

// Validación de teléfono: mínimo 10 dígitos
function isTelefonoValido(telefono: string): boolean {
  if (!telefono.trim()) return false
  const soloDigitos = telefono.replace(/\D/g, "")
  return soloDigitos.length >= 10
}

// ─── Fecha Día/Mes/Año ────────────────────────────────────────────────────────
//
// Un solo input con formato visual "DD/MM/AAAA". Auto-inserta las barras y
// solo acepta dígitos. Internamente emite un string ISO "YYYY-MM-DD" (o ""
// si la fecha aún no está completa / no es válida) para poder guardarla en
// la BD como tipo DATE sin ambigüedad.

// Convierte el valor interno (ISO "YYYY-MM-DD") al texto visible "DD/MM/AAAA".
function isoToDisplay(iso: string): string {
  if (!iso) return ""
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ""
  return `${m[3]}/${m[2]}/${m[1]}`
}

// Da formato mientras el usuario escribe: deja pasar solo dígitos e inserta
// "/" tras 2 y 5 caracteres. Máximo DD/MM/AAAA (10 caracteres).
function formatDisplayWhileTyping(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  let out = ""
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += "/"
    out += digits[i]
  }
  return out
}

// Convierte "DD/MM/AAAA" a ISO "YYYY-MM-DD" si la fecha es completa y válida;
// en caso contrario devuelve "".
function displayToISO(display: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display)
  if (!m) return ""
  const dNum = parseInt(m[1], 10)
  const mNum = parseInt(m[2], 10)
  const yNum = parseInt(m[3], 10)
  if (
    !Number.isFinite(dNum) || !Number.isFinite(mNum) || !Number.isFinite(yNum) ||
    dNum < 1 || dNum > 31 || mNum < 1 || mNum > 12 || yNum < 1900
  ) return ""
  const asDate = new Date(Date.UTC(yNum, mNum - 1, dNum))
  if (
    asDate.getUTCFullYear() !== yNum ||
    asDate.getUTCMonth() !== mNum - 1 ||
    asDate.getUTCDate() !== dNum
  ) return ""
  return `${m[3]}-${m[2]}-${m[1]}`
}

function DateDMY({
  id,
  value,
  onChange,
  disabled,
  required,
}: {
  id: string
  // ISO "YYYY-MM-DD" o ""
  value: string
  // Emite ISO "YYYY-MM-DD" o "" si aún no es válida
  onChange: (iso: string) => void
  disabled?: boolean
  required?: boolean
}) {
  // Estado visible "DD/MM/AAAA" — se deriva del ISO cuando hay valor válido
  // y, mientras el usuario escribe parcial, se mantiene localmente.
  const [display, setDisplay] = useState<string>(() => isoToDisplay(value))

  // Si el valor ISO externo cambia (por ejemplo un reset del formulario),
  // sincronizar el texto mostrado.
  useEffect(() => {
    const fromIso = isoToDisplay(value)
    // Solo sobrescribir si el display actual no corresponde al ISO; así evitamos
    // sobrescribir mientras el usuario está escribiendo.
    if (fromIso && fromIso !== display) {
      setDisplay(fromIso)
    } else if (!value && display && displayToISO(display) === "") {
      // ISO vacío y display inválido → respetar lo que el usuario escribe
    } else if (!value && displayToISO(display) !== "") {
      // El padre limpió el valor → limpiar también
      setDisplay("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = formatDisplayWhileTyping(e.target.value)
    setDisplay(next)
    onChange(displayToISO(next))
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder="DD/MM/AAAA"
      value={display}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      maxLength={10}
      className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
    />
  )
}

// ─── Sub-componentes de UI ────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function SelectGroup({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ─── Barra de progreso ────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 mb-1">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            i < step ? "bg-cyan-500" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  )
}

// ─── Encabezado de propiedad ──────────────────────────────────────────────────

function PropiedadHeader({ info }: { info: PropiedadInfo }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 mb-4">
      <span className="font-medium text-gray-800">
        {info.ciudad ?? "Propiedad"}
        {info.area ? ` · ${info.area} m²` : ""}
      </span>
      <span className="text-gray-400">|</span>
      <span>
        Canon:{" "}
        <span className="font-semibold text-cyan-700">{formatCOP(info.valor_arriendo)}/mes</span>
      </span>
    </div>
  )
}

// ─── Pasos del formulario ─────────────────────────────────────────────────────

type OnChange = <K extends keyof FormData>(field: K, value: FormData[K]) => void

function Paso1({
  form,
  onChange,
  disabled,
}: {
  form: FormData
  onChange: OnChange
  disabled: boolean
}) {
  const emailError = form.email && !isEmailValido(form.email)
  const telefonoError = form.telefono && !isTelefonoValido(form.telefono)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 -mt-1 mb-2">Tus datos personales</p>
      <div>
        <FieldLabel htmlFor="nombre" required>Nombre completo</FieldLabel>
        <Input
          id="nombre"
          value={form.nombre}
          onChange={(e) => onChange("nombre", e.target.value)}
          placeholder=""
          required
          disabled={disabled}
        />
      </div>
      <div>
        <FieldLabel htmlFor="email" required>Correo electrónico</FieldLabel>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder=""
          required
          disabled={disabled}
          className={`${emailError ? "border-red-500 focus:ring-red-500" : ""}`}
        />
        {emailError && (
          <p className="text-xs text-red-600 mt-1">
            El email debe contener @.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="tipo_documento" required>Tipo de documento</FieldLabel>
          <SelectGroup
            id="tipo_documento"
            value={form.tipo_documento}
            onChange={(v) => onChange("tipo_documento", v)}
            options={OPCIONES_TIPO_DOCUMENTO}
            required
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel htmlFor="cedula" required>Número de documento</FieldLabel>
          <Input
            id="cedula"
            value={form.cedula}
            onChange={(e) => onChange("cedula", e.target.value)}
            placeholder=""
            required
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel htmlFor="fecha_expedicion_cedula" required>Fecha de expedición</FieldLabel>
          <DateDMY
            id="fecha_expedicion_cedula"
            value={form.fecha_expedicion_cedula}
            onChange={(iso) => onChange("fecha_expedicion_cedula", iso)}
            required
            disabled={disabled}
          />
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="telefono" required>Teléfono de contacto</FieldLabel>
        <Input
          id="telefono"
          type="tel"
          value={form.telefono}
          onChange={(e) => onChange("telefono", e.target.value)}
          placeholder=""
          required
          disabled={disabled}
          className={`${telefonoError ? "border-red-500 focus:ring-red-500" : ""}`}
        />
        {telefonoError && (
          <p className="text-xs text-red-600 mt-1">
            El teléfono debe tener al menos 10 dígitos.
          </p>
        )}
      </div>
    </div>
  )
}

function Paso2({
  form,
  onChange,
  disabled,
  intentoAvanzar,
}: {
  form: FormData
  onChange: OnChange
  disabled: boolean
  intentoAvanzar: boolean
}) {
  const salarioVacio = form.salario.trim() === ""
  const salarioInvalido = !salarioVacio && !isSalarioValido(form.salario)
  const mostrarErrorSalario = salarioInvalido || (intentoAvanzar && salarioVacio)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 -mt-1 mb-2">Tu situación laboral e ingresos</p>
      <div>
        <FieldLabel htmlFor="empresa_arrendatario" required>Empresa donde labora</FieldLabel>
        <Input
          id="empresa_arrendatario"
          value={form.empresa_arrendatario}
          onChange={(e) => onChange("empresa_arrendatario", e.target.value)}
          placeholder=""
          required
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="antiguedad_meses" required>Antigüedad (meses)</FieldLabel>
          <Input
            id="antiguedad_meses"
            type="number"
            min="0"
            value={form.antiguedad_meses}
            onChange={(e) => onChange("antiguedad_meses", e.target.value)}
            placeholder=""
            required
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel htmlFor="salario" required>Salario mensual</FieldLabel>
          <Input
            id="salario"
            type="number"
            min="0"
            value={form.salario}
            onChange={(e) => onChange("salario", e.target.value)}
            placeholder=""
            required
            disabled={disabled}
            aria-invalid={mostrarErrorSalario || undefined}
            aria-describedby={mostrarErrorSalario ? "salario-error" : undefined}
            className={`${mostrarErrorSalario ? "border-red-500 focus:ring-red-500" : ""}`}
          />
        </div>
      </div>
      {mostrarErrorSalario && (
        <div
          id="salario-error"
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-300 border-l-4 border-l-red-500 bg-red-50 px-3 py-2"
        >
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-xs text-red-700 leading-relaxed">
            <p className="font-semibold">Salario insuficiente</p>
            <p>
              Tu salario mensual debe ser de{" "}
              <strong>al menos $1.000.000</strong>. No podemos aceptar solicitudes
              con un valor menor al mínimo requerido.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const OPCIONES_CANTIDAD = ["1", "2", "3", "4", "5 o más"].map((v) => ({ value: v, label: v }))
const OPCIONES_0_4 = ["0", "1", "2", "3", "4 o más"].map((v) => ({ value: v, label: v }))
const OPCIONES_PERSONAS_TRABAJAN = ["0", "1", "2", "3", "4 o más"].map((v) => ({ value: v, label: v }))

const TEXTO_AUTORIZACION = `Autorizo de manera previa, expresa e informada a Arrenlex SAS, identificada con NIT 902036870-9, como responsable del tratamiento de mis datos personales, para recolectar, almacenar, usar, consultar, actualizar, transmitir, conservar y validar la información que suministre en esta solicitud.

La finalidad del tratamiento será evaluar mi solicitud de arrendamiento, verificar mi identidad, validar la información suministrada, analizar mi capacidad económica, contactar referencias autorizadas por mí, gestionar comunicaciones relacionadas con el inmueble, preparar documentos contractuales y cumplir obligaciones legales o contractuales.

Entiendo que Arrenlex SAS podrá apoyarse en proveedores o plataformas autorizadas para validar información en fuentes permitidas por la ley, únicamente para el estudio de esta solicitud de arrendamiento.

Declaro que la información suministrada es veraz. También declaro que conozco mis derechos a conocer, actualizar, rectificar, solicitar prueba de la autorización, ser informado sobre el uso de mis datos, revocar la autorización y solicitar la supresión de mis datos cuando proceda.

Confirmo que he leído y acepto la Política de Tratamiento de Datos Personales de Arrenlex SAS.`

const ETIQUETA_CHECKBOX_AUTORIZACION =
  "Confirmo que he leído y acepto la Política de Tratamiento de Datos Personales de Arrenlex SAS y autorizo el tratamiento de mis datos personales para el estudio de mi solicitud de arrendamiento."

function Paso3({
  form,
  onChange,
  disabled,
}: {
  form: FormData
  onChange: OnChange
  disabled: boolean
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 -mt-1 mb-2">
        Composición del hogar (quienes vivirán contigo en el inmueble)
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="personas" required>Personas adultas</FieldLabel>
          <SelectGroup
            id="personas"
            value={form.personas}
            onChange={(v) => onChange("personas", v)}
            options={OPCIONES_CANTIDAD}
            placeholder="Selecciona"
            required
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel htmlFor="ninos" required>Niños</FieldLabel>
          <SelectGroup
            id="ninos"
            value={form.ninos}
            onChange={(v) => onChange("ninos", v)}
            options={OPCIONES_0_4}
            placeholder="Selecciona"
            required
            disabled={disabled}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="mascotas" required>Mascotas</FieldLabel>
          <SelectGroup
            id="mascotas"
            value={form.mascotas}
            onChange={(v) => onChange("mascotas", v)}
            options={OPCIONES_0_4}
            placeholder="Selecciona"
            required
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel htmlFor="personas_trabajan" required>Personas que trabajan</FieldLabel>
          <SelectGroup
            id="personas_trabajan"
            value={form.personas_trabajan}
            onChange={(v) => onChange("personas_trabajan", v)}
            options={OPCIONES_PERSONAS_TRABAJAN}
            placeholder="Selecciona"
            required
            disabled={disabled}
          />
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="negocio" required>¿La propiedad es para negocio?</FieldLabel>
        <SelectGroup
          id="negocio"
          value={form.negocio}
          onChange={(v) => onChange("negocio", v)}
          options={[{ value: "Si", label: "Sí" }, { value: "No", label: "No" }]}
          placeholder="Selecciona"
          required
          disabled={disabled}
        />
      </div>

      <div>
        <FieldLabel htmlFor="fecha_ingreso_deseada" required>
          ¿Cuándo deseas pasarte al inmueble?
        </FieldLabel>
        <DateDMY
          id="fecha_ingreso_deseada"
          value={form.fecha_ingreso_deseada}
          onChange={(iso) => onChange("fecha_ingreso_deseada", iso)}
          required
          disabled={disabled}
        />
        <p className="text-xs text-gray-500 mt-1">
          Indícanos la fecha en la que esperas ocupar el inmueble. Esto le ayuda al propietario a
          coordinar la entrega.
        </p>
      </div>

      {/* Autorización de tratamiento de datos */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mt-2">
        <p className="text-xs text-gray-600 leading-relaxed mb-3 whitespace-pre-line">{TEXTO_AUTORIZACION}</p>
        <p className="mb-3">
          <Link
            href="/politica-tratamiento-datos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-cyan-700 underline hover:text-cyan-800"
          >
            Ver Política de Tratamiento de Datos Personales
          </Link>
        </p>
        <label
          htmlFor="autorizacion_politica"
          className={`flex cursor-pointer items-start gap-2.5 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 leading-relaxed ${
            disabled ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          <input
            id="autorizacion_politica"
            type="checkbox"
            checked={form.autorizacion_aceptada}
            onChange={(e) => onChange("autorizacion_aceptada", e.target.checked)}
            disabled={disabled}
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span>{ETIQUETA_CHECKBOX_AUTORIZACION}</span>
        </label>
        {!form.autorizacion_aceptada && (
          <p className="text-xs text-amber-600 mt-2">
            Debes marcar la casilla para enviar la solicitud.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Pantalla de éxito ────────────────────────────────────────────────────────

function PantallaExito({ propiedadId }: { propiedadId: string }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <CheckCircle className="h-16 w-16 text-cyan-500 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Solicitud enviada!</h2>
      <p className="text-gray-500 max-w-sm mb-6">
        Hemos recibido tu aplicación de arrendamiento. Nuestro equipo la revisará y se pondrá en
        contacto contigo a la brevedad.
      </p>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button asChild className="w-full">
          <Link href={`/catalogo/propiedades/${propiedadId}`}>Ver la propiedad</Link>
        </Button>
        <Button variant="outline" asChild className="w-full">
          <Link href="/catalogo">Explorar más propiedades</Link>
        </Button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AplicacionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const propiedadId = params.id as string
  const token = searchParams.get("token")?.trim() ?? ""

  const [propiedadInfo, setPropiedadInfo] = useState<PropiedadInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [propiedadError, setPropiedadError] = useState(false)
  const [tokenErrorMsg, setTokenErrorMsg] = useState<string | null>(null)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [intentoAvanzar, setIntentoAvanzar] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenErrorMsg("Se requiere un enlace de invitación válido para acceder.")
      setLoadingInfo(false)
      return
    }

    setLoadingInfo(true)
    setPropiedadError(false)
    setTokenErrorMsg(null)

    const url = `/api/propiedades/${propiedadId}/aplicacion-info?token=${encodeURIComponent(token)}`

    fetch(url)
      .then(async (res) => {
        if (res.status === 410) {
          const json = await res.json().catch(() => ({}))
          setTokenErrorMsg(
            (json as { error?: string }).error ??
              "Este enlace no es válido, ya fue utilizado o ha expirado."
          )
          throw new Error("token-invalid")
        }
        if (!res.ok) throw new Error("not-found")
        return res.json()
      })
      .then((data: PropiedadInfo) => setPropiedadInfo(data))
      .catch((err) => {
        if ((err as Error).message !== "token-invalid") setPropiedadError(true)
      })
      .finally(() => setLoadingInfo(false))
  }, [propiedadId, token])

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const canAdvance = (): boolean => {
    if (step === 1) {
      return (
        form.nombre.trim() !== "" &&
        form.email.trim() !== "" &&
        isEmailValido(form.email) &&
        form.tipo_documento.trim() !== "" &&
        form.cedula.trim() !== "" &&
        form.fecha_expedicion_cedula !== "" &&
        form.telefono.trim() !== "" &&
        isTelefonoValido(form.telefono)
      )
    }
    if (step === 2) {
      return (
        form.empresa_arrendatario.trim() !== "" &&
        form.antiguedad_meses.trim() !== "" &&
        form.salario.trim() !== "" &&
        isSalarioValido(form.salario)
      )
    }
    return false
  }

  const canSubmit =
    form.autorizacion_aceptada &&
    form.personas !== "" &&
    form.ninos !== "" &&
    form.mascotas !== "" &&
    form.personas_trabajan !== "" &&
    form.negocio !== "" &&
    form.fecha_ingreso_deseada !== ""

  const motivoBloqueo = (): { mensaje: string; idCampo?: string } | null => {
    if (step === 1) {
      if (!form.nombre.trim()) return { mensaje: "Ingresa el nombre completo.", idCampo: "nombre" }
      if (!form.email.trim() || !isEmailValido(form.email))
        return { mensaje: "Ingresa un correo electrónico válido.", idCampo: "email" }
      if (!form.tipo_documento.trim())
        return { mensaje: "Selecciona el tipo de documento.", idCampo: "tipo_documento" }
      if (!form.cedula.trim()) return { mensaje: "Ingresa el número de documento.", idCampo: "cedula" }
      if (!form.fecha_expedicion_cedula)
        return { mensaje: "Ingresa la fecha de expedición.", idCampo: "fecha_expedicion_cedula" }
      if (!form.telefono.trim() || !isTelefonoValido(form.telefono))
        return { mensaje: "El teléfono debe tener al menos 10 dígitos.", idCampo: "telefono" }
      return null
    }
    if (step === 2) {
      if (!form.empresa_arrendatario.trim())
        return { mensaje: "Ingresa la empresa donde labora.", idCampo: "empresa_arrendatario" }
      if (!form.antiguedad_meses.trim())
        return { mensaje: "Ingresa la antigüedad en meses.", idCampo: "antiguedad_meses" }
      if (!form.salario.trim() || !isSalarioValido(form.salario))
        return {
          mensaje: "Tu salario mensual debe ser de al menos $1.000.000.",
          idCampo: "salario",
        }
      return null
    }
    return null
  }

  const handleNext = () => {
    if (!canAdvance()) {
      setIntentoAvanzar(true)
      const motivo = motivoBloqueo()
      if (motivo?.idCampo) {
        const target = document.getElementById(motivo.idCampo)
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" })
          setTimeout(() => {
            try {
              target.focus({ preventScroll: true })
            } catch {
              target.focus()
            }
          }, 250)
        }
      }
      return
    }

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1)
      setIntentoAvanzar(false)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1)
      setIntentoAvanzar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    if (!token) {
      setSubmitError("Falta el enlace de invitación. Abre la página desde el enlace que te compartieron.")
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch("/api/intake/aplicacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          propiedad_id: propiedadId,
          token,
          autorizacion: "Si",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError(
          (data as { error?: string }).error ?? "Error al enviar la solicitud. Intenta nuevamente."
        )
        return
      }
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando información de la propiedad…</p>
      </div>
    )
  }

  if (tokenErrorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
              <ClipboardList className="h-7 w-7 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Enlace no disponible</h2>
            <p className="text-gray-500 text-sm">{tokenErrorMsg}</p>
            <Button asChild variant="outline" className="mt-2">
              <Link href="/catalogo">Volver al catálogo</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (propiedadError || !propiedadInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-gray-600 mb-4">Esta propiedad no está disponible para aplicar.</p>
        <Button asChild variant="outline">
          <Link href="/catalogo">Volver al catálogo</Link>
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-lg p-8">
          <PantallaExito propiedadId={propiedadId} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto w-full max-w-lg">
        <Button variant="ghost" size="sm" className="-ml-2 mb-4 text-gray-500" asChild>
          <Link href={`/catalogo/propiedades/${propiedadId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a la propiedad
          </Link>
        </Button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 pt-6 pb-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-5 w-5 opacity-80" />
              <h1 className="text-lg font-semibold">Aplicación de arrendamiento</h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 text-cyan-100 text-sm">
              <span>
                {propiedadInfo.ciudad ?? "Propiedad"}
                {propiedadInfo.area ? ` · ${propiedadInfo.area} m²` : ""}
              </span>
              <span className="opacity-50">|</span>
              <span>
                Canon:{" "}
                <span className="text-white font-medium">
                  {formatCOP(propiedadInfo.valor_arriendo)}/mes
                </span>
              </span>
              <span className="text-cyan-100/90 text-xs w-full mt-1 basis-full">
                Completa solo tus datos; este formulario es para una persona.
              </span>
            </div>
          </div>

          <div className="px-6 pt-4 pb-1">
            <ProgressBar step={step} />
            <div className="flex justify-between items-center mt-1.5">
              <p className="text-xs text-gray-400">
                Paso {step} de {TOTAL_STEPS}
              </p>
              <p className="text-xs font-medium text-gray-600">{PASO_TITULOS[step - 1]}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5">
              {step === 1 && (
                <Paso1
                  form={form}
                  onChange={handleChange}
                  disabled={submitting}
                />
              )}
              {step === 2 && (
                <Paso2
                  form={form}
                  onChange={handleChange}
                  disabled={submitting}
                  intentoAvanzar={intentoAvanzar}
                />
              )}
              {step === 3 && <Paso3 form={form} onChange={handleChange} disabled={submitting} />}

              {submitError && (
                <p className="text-sm text-red-600 mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2">
                  {submitError}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center px-6 pb-6 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={step === 1 || submitting}
                className="text-gray-500"
                tabIndex={-1}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>

              {step < TOTAL_STEPS ? (
                (() => {
                  const motivo = motivoBloqueo()
                  const bloqueado = motivo !== null
                  return (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={submitting}
                      aria-disabled={bloqueado || undefined}
                      title={bloqueado ? motivo!.mensaje : undefined}
                      className={`text-white ${
                        bloqueado
                          ? "bg-cyan-500/50 hover:bg-cyan-500/50 cursor-not-allowed"
                          : "bg-cyan-500 hover:bg-cyan-600"
                      }`}
                    >
                      Siguiente
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  )
                })()
              ) : (
                <Button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-40"
                >
                  {submitting ? "Enviando…" : "Enviar solicitud"}
                </Button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Tus datos son tratados con confidencialidad conforme a la normativa colombiana de protección de datos.
        </p>
      </div>
    </div>
  )
}
