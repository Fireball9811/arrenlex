"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ArrowRight, CheckCircle, ClipboardList } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type PropiedadInfo = {
  id: string
  ciudad: string | null
  area: number
  valor_arriendo: number
  descripcion: string | null
}

type FormData = {
  // Paso 1 — Arrendatario
  nombre: string
  email: string
  cedula: string
  fecha_expedicion_cedula: string
  telefono: string
  // Paso 2 — Laboral arrendatario
  empresa_arrendatario: string
  antiguedad_meses: string
  salario: string
  ingresos: string
  // Paso 3 — Coarrendatario
  nombre_coarrendatario: string
  cedula_coarrendatario: string
  fecha_expedicion_cedula_coarrendatario: string
  empresa_coarrendatario: string
  antiguedad_meses_2: string
  salario_2: string
  telefono_coarrendatario: string
  // Paso 4 — Hogar y autorización
  personas: string
  ninos: string
  mascotas: string
  personas_trabajan: string
  negocio: string
  autorizacion: string
}

const INITIAL_FORM: FormData = {
  nombre: "",
  email: "",
  cedula: "",
  fecha_expedicion_cedula: "",
  telefono: "",
  empresa_arrendatario: "",
  antiguedad_meses: "",
  salario: "",
  ingresos: "",
  nombre_coarrendatario: "",
  cedula_coarrendatario: "",
  fecha_expedicion_cedula_coarrendatario: "",
  empresa_coarrendatario: "",
  antiguedad_meses_2: "",
  salario_2: "",
  telefono_coarrendatario: "",
  personas: "",
  ninos: "",
  mascotas: "",
  personas_trabajan: "",
  negocio: "",
  autorizacion: "",
}

const TOTAL_STEPS = 4

const PASO_TITULOS = [
  "Información personal",
  "Situación laboral",
  "Coarrendatario",
  "Tu hogar",
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

// Validación de email
function isEmailValido(email: string): boolean {
  if (!email.trim()) return false
  return email.includes("@")
}

// Validación de salario: mínimo 7 dígitos
function isSalarioValido(salario: string): boolean {
  if (!salario.trim()) return false
  const soloDigitos = salario.replace(/\D/g, "")
  return soloDigitos.length >= 7
}

// Validación de teléfono: mínimo 10 dígitos
function isTelefonoValido(telefono: string): boolean {
  if (!telefono.trim()) return false
  const soloDigitos = telefono.replace(/\D/g, "")
  return soloDigitos.length >= 10
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

function Paso1({
  form,
  onChange,
  disabled,
}: {
  form: FormData
  onChange: (field: keyof FormData, value: string) => void
  disabled: boolean
}) {
  const emailError = form.email && !isEmailValido(form.email)
  const telefonoError = form.telefono && !isTelefonoValido(form.telefono)
  
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 -mt-1 mb-2">Datos del arrendatario principal</p>
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
          <FieldLabel htmlFor="cedula" required>Cédula</FieldLabel>
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
          <input
            id="fecha_expedicion_cedula"
            type="date"
            value={form.fecha_expedicion_cedula}
            onChange={(e) => onChange("fecha_expedicion_cedula", e.target.value)}
            required
            disabled={disabled}
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
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
}: {
  form: FormData
  onChange: (field: keyof FormData, value: string) => void
  disabled: boolean
}) {
  const salarioError = form.salario && !isSalarioValido(form.salario)
  
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 -mt-1 mb-2">Información laboral del arrendatario</p>
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
            className={`${salarioError ? "border-red-500 focus:ring-red-500" : ""}`}
          />
          {salarioError && (
            <p className="text-xs text-red-600 mt-1">
              El salario debe tener al menos 7 dígitos o está muy bajo para ser considerado.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Paso3({
  form,
  onChange,
  disabled,
}: {
  form: FormData
  onChange: (field: keyof FormData, value: string) => void
  disabled: boolean
}) {
  const salarioError = form.salario_2 && !isSalarioValido(form.salario_2)
  const telefonoError = form.telefono_coarrendatario && !isTelefonoValido(form.telefono_coarrendatario)
  
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 -mt-1 mb-2">Datos del coarrendatario</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="nombre_coarrendatario" required>Nombre completo</FieldLabel>
          <Input
            id="nombre_coarrendatario"
            value={form.nombre_coarrendatario}
            onChange={(e) => onChange("nombre_coarrendatario", e.target.value)}
            placeholder=""
            required
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel htmlFor="cedula_coarrendatario" required>Cédula</FieldLabel>
          <Input
            id="cedula_coarrendatario"
            value={form.cedula_coarrendatario}
            onChange={(e) => onChange("cedula_coarrendatario", e.target.value)}
            placeholder=""
            required
            disabled={disabled}
          />
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="fecha_expedicion_cedula_coarrendatario" required>Fecha de expedición cédula</FieldLabel>
        <input
          id="fecha_expedicion_cedula_coarrendatario"
          type="date"
          value={form.fecha_expedicion_cedula_coarrendatario}
          onChange={(e) => onChange("fecha_expedicion_cedula_coarrendatario", e.target.value)}
          required
          disabled={disabled}
          className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
        />
      </div>
      <div>
        <FieldLabel htmlFor="empresa_coarrendatario" required>Empresa donde labora</FieldLabel>
        <Input
          id="empresa_coarrendatario"
          value={form.empresa_coarrendatario}
          onChange={(e) => onChange("empresa_coarrendatario", e.target.value)}
          placeholder=""
          required
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <FieldLabel htmlFor="antiguedad_meses_2" required>Antigüedad (meses)</FieldLabel>
          <Input
            id="antiguedad_meses_2"
            type="number"
            min="0"
            value={form.antiguedad_meses_2}
            onChange={(e) => onChange("antiguedad_meses_2", e.target.value)}
            placeholder=""
            required
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel htmlFor="salario_2" required>Salario mensual</FieldLabel>
          <Input
            id="salario_2"
            type="number"
            min="0"
            value={form.salario_2}
            onChange={(e) => onChange("salario_2", e.target.value)}
            placeholder=""
            required
            disabled={disabled}
            className={`${salarioError ? "border-red-500 focus:ring-red-500" : ""}`}
          />
          {salarioError && (
            <p className="text-xs text-red-600 mt-1">
              El salario debe tener al menos 7 dígitos.
            </p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="telefono_coarrendatario" required>Teléfono</FieldLabel>
          <Input
            id="telefono_coarrendatario"
            type="tel"
            value={form.telefono_coarrendatario}
            onChange={(e) => onChange("telefono_coarrendatario", e.target.value)}
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
    </div>
  )
}

const OPCIONES_CANTIDAD = ["1", "2", "3", "4", "5 o más"].map((v) => ({ value: v, label: v }))
const OPCIONES_0_4 = ["0", "1", "2", "3", "4 o más"].map((v) => ({ value: v, label: v }))
const OPCIONES_PERSONAS_TRABAJAN = ["0", "1", "2", "3", "4 o más"].map((v) => ({ value: v, label: v }))

const TEXTO_AUTORIZACION =
  "Autorizo de manera expresa a Arrenlex SAS, identificada con NIT 9 0 2 0 3 6 8 7 0 - 9, como responsable del tratamiento de datos, y/o a quien esta designe como encargado, para verificar la información suministrada en la presente solicitud, incluyendo datos laborales, ingresos, referencias personales y comerciales, historial de arrendamiento y, de ser necesario, consultas en centrales de riesgo, bases de datos financieras y antecedentes, a través de operadores o plataformas legalmente autorizadas. Declaro que la información suministrada es veraz y autorizo su validación únicamente con el propósito de evaluar mi aplicación de arrendamiento. Entiendo que mis datos serán tratados de manera confidencial y conforme a la normativa vigente en materia de protección de datos personales."

function Paso4({
  form,
  onChange,
  disabled,
}: {
  form: FormData
  onChange: (field: keyof FormData, value: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 -mt-1 mb-2">
        Cuéntanos sobre quienes vivirán en la propiedad
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

      {/* Autorización de tratamiento de datos */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mt-2">
        <p className="text-xs text-gray-600 leading-relaxed mb-3">{TEXTO_AUTORIZACION}</p>
        <div className="flex gap-3">
          {[{ value: "Si", label: "Sí, autorizo" }, { value: "No", label: "No autorizo" }].map(
            (opt) => (
              <label
                key={opt.value}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  form.autorizacion === opt.value
                    ? opt.value === "Si"
                      ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                      : "border-red-400 bg-red-50 text-red-700"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="autorizacion"
                  value={opt.value}
                  checked={form.autorizacion === opt.value}
                  onChange={() => onChange("autorizacion", opt.value)}
                  disabled={disabled}
                  className="sr-only"
                />
                {opt.label}
              </label>
            )
          )}
        </div>
        {form.autorizacion === "No" && (
          <p className="text-xs text-red-600 mt-2">
            Debes autorizar el tratamiento de datos para enviar la solicitud.
          </p>
        )}
        {!form.autorizacion && (
          <p className="text-xs text-amber-600 mt-2">
            Por favor indica si autorizas el tratamiento de datos.
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const propiedadId = params.id as string
  const token = searchParams.get("token") ?? ""

  const [propiedadInfo, setPropiedadInfo] = useState<PropiedadInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [propiedadError, setPropiedadError] = useState(false)
  const [tokenErrorMsg, setTokenErrorMsg] = useState<string | null>(null)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Cargar info de la propiedad al montar — el token se pasa al API
  useEffect(() => {
    const url = token
      ? `/api/propiedades/${propiedadId}/aplicacion-info?token=${encodeURIComponent(token)}`
      : `/api/propiedades/${propiedadId}/aplicacion-info`

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

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Validaciones por paso para habilitar "Siguiente"
  const canAdvance = (): boolean => {
    if (step === 1) {
      return (
        form.nombre.trim() !== "" &&
        form.email.trim() !== "" &&
        isEmailValido(form.email) &&
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
    if (step === 3) {
      return (
        form.nombre_coarrendatario.trim() !== "" &&
        form.cedula_coarrendatario.trim() !== "" &&
        form.fecha_expedicion_cedula_coarrendatario !== "" &&
        form.empresa_coarrendatario.trim() !== "" &&
        form.antiguedad_meses_2.trim() !== "" &&
        form.salario_2.trim() !== "" &&
        isSalarioValido(form.salario_2) &&
        form.telefono_coarrendatario.trim() !== "" &&
        isTelefonoValido(form.telefono_coarrendatario)
      )
    }
    return false
  }

  // El botón de enviar solo se habilita si autorizacion === "Si" y campos del paso 4 completos
  const canSubmit =
    form.autorizacion === "Si" &&
    form.personas !== "" &&
    form.ninos !== "" &&
    form.mascotas !== "" &&
    form.personas_trabajan !== "" &&
    form.negocio !== ""

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch("/api/intake/aplicacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, propiedad_id: propiedadId, token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError(data.error ?? "Error al enviar la solicitud. Intenta nuevamente.")
        return
      }
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Estados de carga / error ──────────────────────────────────────────────

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

  // ── Pantalla de éxito ─────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-lg p-8">
          <PantallaExito propiedadId={propiedadId} />
        </div>
      </div>
    )
  }

  // ── Wizard ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto w-full max-w-lg">

        {/* Volver */}
        <Button variant="ghost" size="sm" className="-ml-2 mb-4 text-gray-500" asChild>
          <Link href={`/catalogo/propiedades/${propiedadId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a la propiedad
          </Link>
        </Button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Cabecera */}
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 pt-6 pb-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-5 w-5 opacity-80" />
              <h1 className="text-lg font-semibold">Aplicación de Arrendamiento</h1>
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
            </div>
          </div>

          {/* Progreso */}
          <div className="px-6 pt-4 pb-1">
            <ProgressBar step={step} />
            <div className="flex justify-between items-center mt-1.5">
              <p className="text-xs text-gray-400">
                Paso {step} de {TOTAL_STEPS}
              </p>
              <p className="text-xs font-medium text-gray-600">{PASO_TITULOS[step - 1]}</p>
            </div>
          </div>

          {/* Cuerpo del paso */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5">
              {step === 1 && <Paso1 form={form} onChange={handleChange} disabled={submitting} />}
              {step === 2 && <Paso2 form={form} onChange={handleChange} disabled={submitting} />}
              {step === 3 && <Paso3 form={form} onChange={handleChange} disabled={submitting} />}
              {step === 4 && <Paso4 form={form} onChange={handleChange} disabled={submitting} />}

              {submitError && (
                <p className="text-sm text-red-600 mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2">
                  {submitError}
                </p>
              )}
            </div>

            {/* Navegación */}
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
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canAdvance()}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  Siguiente
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
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

        {/* Nota de privacidad */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Tus datos son tratados con confidencialidad conforme a la normativa colombiana de protección de datos.
        </p>
      </div>
    </div>
  )
}
