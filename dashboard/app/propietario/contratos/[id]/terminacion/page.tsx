"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ArrowLeft,
  Save,
  FileText,
  Trash2,
  Plus,
  CheckCircle2,
  Home,
  Upload,
  Camera,
} from "lucide-react"
import { compressImage } from "@/lib/utils/compress-image"

type Terminacion = {
  id: string
  contrato_id: string
  deposito: number | string
  fecha_entrega: string | null
  lectura_agua: string | null
  valor_agua: number | string
  lectura_gas: string | null
  valor_gas: number | string
  lectura_energia: string | null
  valor_energia: number | string
  notas: string | null
  finalizado: boolean
  finalizado_en: string | null
}

type Registro = {
  id: string
  descripcion: string
  valor: number | string
  foto_url: string | null
  orden: number
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n || 0)

// Input de moneda: muestra con formato pero guarda número
function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: number
  onChange: (n: number) => void
  placeholder?: string
}) {
  const [text, setText] = useState<string>(value ? new Intl.NumberFormat("es-CO").format(value) : "")

  useEffect(() => {
    const n = typeof value === "number" ? value : Number(value) || 0
    setText(n ? new Intl.NumberFormat("es-CO").format(n) : "")
  }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={text}
      placeholder={placeholder ?? "$ 0"}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d]/g, "")
        const n = raw ? parseInt(raw, 10) : 0
        setText(raw ? new Intl.NumberFormat("es-CO").format(n) : "")
        onChange(n)
      }}
      onBlur={() => {
        const n = Number(text.replace(/[^\d]/g, "")) || 0
        setText(n ? new Intl.NumberFormat("es-CO").format(n) : "")
      }}
    />
  )
}

export default function TerminacionContratoPage() {
  const params = useParams()
  const router = useRouter()
  const contratoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contratoEstado, setContratoEstado] = useState<string>("")
  const [terminacion, setTerminacion] = useState<Terminacion | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})

  // Form
  const [form, setForm] = useState({
    deposito: 0,
    fecha_entrega: "",
    lectura_agua: "",
    valor_agua: 0,
    lectura_gas: "",
    valor_gas: 0,
    lectura_energia: "",
    valor_energia: 0,
    notas: "",
  })

  // Nuevo registro
  const [nuevoReg, setNuevoReg] = useState({
    descripcion: "",
    valor: 0,
    archivo: null as File | null,
    preview: "",
  })
  const [subiendoRegistro, setSubiendoRegistro] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    cargar()
  }, [contratoId])

  async function cargar() {
    setLoading(true)
    try {
      const [resTerm, resContrato] = await Promise.all([
        fetch(`/api/contratos/${contratoId}/terminacion`),
        fetch(`/api/contratos/${contratoId}`),
      ])
      if (resTerm.ok) {
        const data = await resTerm.json()
        const t: Terminacion = data.terminacion
        const regs: Registro[] = data.registros || []
        setTerminacion(t)
        setRegistros(regs)
        setForm({
          deposito: Number(t.deposito) || 0,
          fecha_entrega: t.fecha_entrega?.split("T")[0] || "",
          lectura_agua: t.lectura_agua || "",
          valor_agua: Number(t.valor_agua) || 0,
          lectura_gas: t.lectura_gas || "",
          valor_gas: Number(t.valor_gas) || 0,
          lectura_energia: t.lectura_energia || "",
          valor_energia: Number(t.valor_energia) || 0,
          notas: t.notas || "",
        })
        // Cargar previews de las fotos
        regs.forEach((r) => {
          if (r.foto_url) {
            fetch(`/api/contratos/${contratoId}/terminacion/registros/${r.id}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((d) => {
                if (d?.url) setPreviews((p) => ({ ...p, [r.id]: d.url }))
              })
              .catch(() => {})
          }
        })
      }
      if (resContrato.ok) {
        const c = await resContrato.json()
        setContratoEstado(c.estado || "")
      }
    } finally {
      setLoading(false)
    }
  }

  const totales = useMemo(() => {
    const totalServicios =
      Number(form.valor_agua || 0) + Number(form.valor_gas || 0) + Number(form.valor_energia || 0)
    const totalRegistros = registros.reduce((acc, r) => acc + (Number(r.valor) || 0), 0)
    const deudaTotal = totalServicios + totalRegistros
    const saldo = Number(form.deposito || 0) - deudaTotal
    return { totalServicios, totalRegistros, deudaTotal, saldo }
  }, [form, registros])

  async function handleGuardar() {
    setSaving(true)
    try {
      const res = await fetch(`/api/contratos/${contratoId}/terminacion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Error guardando")
      } else {
        alert("Cambios guardados")
        cargar()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSeleccionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const comprimida = await compressImage(file, { maxSide: 1280, quality: 0.72 })
      setNuevoReg((n) => ({
        ...n,
        archivo: comprimida,
        preview: URL.createObjectURL(comprimida),
      }))
    } catch (err) {
      console.error(err)
      alert("No se pudo procesar la imagen")
    }
  }

  async function handleAgregarRegistro() {
    if (!nuevoReg.descripcion.trim()) {
      alert("Agrega una descripción al registro")
      return
    }
    setSubiendoRegistro(true)
    try {
      const fd = new FormData()
      fd.append("descripcion", nuevoReg.descripcion.trim())
      fd.append("valor", String(nuevoReg.valor || 0))
      if (nuevoReg.archivo) fd.append("archivo", nuevoReg.archivo)

      const res = await fetch(`/api/contratos/${contratoId}/terminacion/registros`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Error agregando registro")
        return
      }
      setNuevoReg({ descripcion: "", valor: 0, archivo: null, preview: "" })
      if (fileInputRef.current) fileInputRef.current.value = ""
      await cargar()
    } finally {
      setSubiendoRegistro(false)
    }
  }

  async function handleEliminarRegistro(reg: Registro) {
    if (!confirm(`¿Eliminar el registro "${reg.descripcion}"?`)) return
    const res = await fetch(`/api/contratos/${contratoId}/terminacion/registros/${reg.id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const err = await res.json()
      alert(err.error || "Error eliminando")
      return
    }
    await cargar()
  }

  async function handleDescargarPDF() {
    // Primero guardamos, luego descargamos
    await handleGuardar()
    window.open(`/api/contratos/${contratoId}/terminacion/pdf`, "_blank")
  }

  async function handleLiberarPropiedad() {
    if (!confirm("¿Marcar el inmueble como DISPONIBLE? El contrato NO se finalizará.")) return
    const res = await fetch(`/api/contratos/${contratoId}/liberar-propiedad`, { method: "POST" })
    if (!res.ok) {
      const err = await res.json()
      alert(err.error || "Error")
      return
    }
    alert("Inmueble pasado a disponible")
  }

  async function handleFinalizarContrato() {
    if (
      !confirm(
        "¿FINALIZAR el contrato? Esto marcará el contrato como terminado, el inmueble como disponible y cerrará la terminación."
      )
    )
      return
    await handleGuardar()
    const res = await fetch(`/api/contratos/${contratoId}/terminacion/finalizar`, {
      method: "POST",
    })
    if (!res.ok) {
      const err = await res.json()
      alert(err.error || "Error")
      return
    }
    alert("Contrato finalizado")
    router.push(`/propietario/contratos/${contratoId}`)
  }

  if (loading) return <p className="text-muted-foreground">Cargando...</p>

  const estadoBadge: Record<string, { label: string; cls: string }> = {
    borrador: { label: "Borrador", cls: "bg-gray-100 text-gray-800" },
    activo: { label: "Activo", cls: "bg-green-100 text-green-800" },
    terminado: { label: "Terminado", cls: "bg-blue-100 text-blue-800" },
    vencido: { label: "Vencido", cls: "bg-red-100 text-red-800" },
    pendiente_cierre: { label: "Pendiente de cierre", cls: "bg-amber-100 text-amber-800" },
  }
  const badge = estadoBadge[contratoEstado] || estadoBadge.borrador

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/propietario/contratos/${contratoId}/editar`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Terminación de contrato</h1>
            <p className="text-sm text-muted-foreground">
              Liquidación final: depósito, servicios y daños
            </p>
          </div>
        </div>
        <span className={`rounded px-3 py-1 text-sm font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {terminacion?.finalizado && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="pt-6 text-sm">
            <strong>Terminación finalizada.</strong> Este contrato ya fue cerrado el{" "}
            {terminacion.finalizado_en
              ? new Date(terminacion.finalizado_en).toLocaleString("es-CO")
              : ""}
            .
          </CardContent>
        </Card>
      )}

      {/* Depósito y fecha de entrega */}
      <Card>
        <CardHeader>
          <CardTitle>Depósito y entrega</CardTitle>
          <CardDescription>Información básica de la liquidación</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Valor del depósito</label>
            <MoneyInput
              value={form.deposito}
              onChange={(n) => setForm({ ...form, deposito: n })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Fecha en que se dejó el inmueble
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.fecha_entrega}
              onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Servicios públicos */}
      <Card>
        <CardHeader>
          <CardTitle>Servicios públicos</CardTitle>
          <CardDescription>Lectura de medidores y valor según recibo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              { key: "agua", label: "Agua" },
              { key: "gas", label: "Gas" },
              { key: "energia", label: "Energía" },
            ] as const
          ).map((s) => (
            <div key={s.key} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Lectura medidor de {s.label.toLowerCase()}
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Ej: 12345 m³"
                  value={(form as any)[`lectura_${s.key}`]}
                  onChange={(e) =>
                    setForm({ ...form, [`lectura_${s.key}`]: e.target.value } as any)
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Valor según recibo ({s.label.toLowerCase()})
                </label>
                <MoneyInput
                  value={(form as any)[`valor_${s.key}`]}
                  onChange={(n) => setForm({ ...form, [`valor_${s.key}`]: n } as any)}
                />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Total servicios</span>
            <span className="font-semibold">{fmtMoney(totales.totalServicios)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de daños y anotaciones</CardTitle>
          <CardDescription>
            Una foto por registro (se comprime automáticamente antes de subir).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {registros.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay registros agregados.</p>
          ) : (
            <div className="space-y-3">
              {registros.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  {r.foto_url ? (
                    previews[r.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previews[r.id]}
                        alt="foto"
                        className="h-20 w-20 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                        …
                      </div>
                    )
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded bg-muted">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{r.descripcion}</p>
                    <p className="text-sm text-muted-foreground">{fmtMoney(Number(r.valor))}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleEliminarRegistro(r)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-dashed p-4">
            <p className="mb-3 text-sm font-medium">Agregar nuevo registro</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Descripción</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Ej: pared rayada en habitación principal"
                  value={nuevoReg.descripcion}
                  onChange={(e) =>
                    setNuevoReg({ ...nuevoReg, descripcion: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Valor</label>
                <MoneyInput
                  value={nuevoReg.valor}
                  onChange={(n) => setNuevoReg({ ...nuevoReg, valor: n })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Foto (opcional)</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSeleccionarFoto}
                    />
                    <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                      <Upload className="h-4 w-4" />
                      {nuevoReg.archivo ? "Cambiar" : "Seleccionar"}
                    </span>
                  </label>
                  {nuevoReg.preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nuevoReg.preview}
                      alt="preview"
                      className="h-12 w-12 rounded object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Button onClick={handleAgregarRegistro} disabled={subiendoRegistro}>
                <Plus className="mr-2 h-4 w-4" />
                {subiendoRegistro ? "Agregando..." : "Agregar registro"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Total registros</span>
            <span className="font-semibold">{fmtMoney(totales.totalRegistros)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notas */}
      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
          <CardDescription>Observaciones generales de la terminación</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Comentarios, condiciones acordadas, etc."
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Resumen financiero */}
      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle>Liquidación final</CardTitle>
          <CardDescription>Cálculo automático del saldo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Depósito entregado</span>
            <span className="font-medium">{fmtMoney(Number(form.deposito) || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>(−) Servicios</span>
            <span className="font-medium">{fmtMoney(totales.totalServicios)}</span>
          </div>
          <div className="flex justify-between">
            <span>(−) Registros/daños</span>
            <span className="font-medium">{fmtMoney(totales.totalRegistros)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span>Deuda total</span>
            <span className="font-semibold">{fmtMoney(totales.deudaTotal)}</span>
          </div>
          <div
            className={`mt-3 rounded-lg p-3 text-center text-sm font-semibold ${
              totales.saldo > 0
                ? "bg-green-100 text-green-800"
                : totales.saldo < 0
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
            }`}
          >
            {totales.saldo > 0 &&
              `Se debe devolver al inquilino ${fmtMoney(totales.saldo)}`}
            {totales.saldo < 0 &&
              `El inquilino debe al propietario ${fmtMoney(Math.abs(totales.saldo))}`}
            {totales.saldo === 0 && "Sin saldo pendiente"}
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleGuardar} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        <Button variant="outline" onClick={handleDescargarPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Descargar acta PDF
        </Button>
        <Button variant="outline" onClick={handleLiberarPropiedad}>
          <Home className="mr-2 h-4 w-4" />
          Pasar inmueble a disponible
        </Button>
        <Button
          variant="destructive"
          onClick={handleFinalizarContrato}
          disabled={terminacion?.finalizado}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Finalizar contrato
        </Button>
      </div>
    </div>
  )
}
