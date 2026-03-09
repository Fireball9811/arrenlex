"use client"

import { useState } from "react"
import Link from "next/link"
import {
  X,
  Home,
  Key,
  Megaphone,
  FileText,
  Settings,
  Shield,
  CheckCircle,
  ArrowLeft,
  Search,
  Headphones,
} from "lucide-react"
import { useLang } from "@/lib/i18n/context"

type Tipo = "propietario" | "arrendatario"
type Step = 1 | 2 | 3

interface ContactModalProps {
  open: boolean
  onClose: () => void
}

export function ContactModal({ open, onClose }: ContactModalProps) {
  const { t } = useLang()
  const ct = t.landing.contacto.modal

  const [step, setStep] = useState<Step>(1)
  const [tipo, setTipo] = useState<Tipo | null>(null)
  const [nombre, setNombre] = useState("")
  const [celular, setCelular] = useState("")
  const [email, setEmail] = useState("")
  const [autorizado, setAutorizado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  function handleClose() {
    setStep(1)
    setTipo(null)
    setNombre("")
    setCelular("")
    setEmail("")
    setAutorizado(false)
    setLoading(false)
    setSuccess(false)
    setError("")
    onClose()
  }

  function handleRoleSelect(role: Tipo) {
    setTipo(role)
    setStep(2)
  }

  function handleBack() {
    setError("")
    if (step === 2) {
      setStep(1)
      setTipo(null)
    } else if (step === 3) {
      if (tipo === "propietario") {
        setStep(2)
      } else {
        setStep(1)
        setTipo(null)
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!nombre.trim() || !celular.trim() || !email.trim()) {
      setError(ct.camposObligatorios)
      return
    }
    if (!autorizado) {
      setError(ct.debesAutorizar)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          celular: celular.trim(),
          email: email.trim(),
          tipo,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || ct.errorEnvio)
        return
      }
      setSuccess(true)
    } catch {
      setError(ct.errorEnvio)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const ventajasPropietario = [
    { icon: Megaphone, titulo: ct.ventaja1Titulo, desc: ct.ventaja1Desc },
    { icon: FileText, titulo: ct.ventaja2Titulo, desc: ct.ventaja2Desc },
    { icon: Settings, titulo: ct.ventaja3Titulo, desc: ct.ventaja3Desc },
    { icon: Shield, titulo: ct.ventaja4Titulo, desc: ct.ventaja4Desc },
  ]

  const ventajasArrendatario = [
    { icon: Search, titulo: ct.ventajaArrendatario1Titulo, desc: ct.ventajaArrendatario1Desc },
    { icon: CheckCircle, titulo: ct.ventajaArrendatario2Titulo, desc: ct.ventajaArrendatario2Desc },
    { icon: Home, titulo: ct.ventajaArrendatario3Titulo, desc: ct.ventajaArrendatario3Desc },
    { icon: Headphones, titulo: ct.ventajaArrendatario4Titulo, desc: ct.ventajaArrendatario4Desc },
  ]

  const ventajas = tipo === "arrendatario" ? ventajasArrendatario : ventajasPropietario
  const ventajasTitulo =
    tipo === "arrendatario" ? ct.ventajasArrendatarioTitulo : ct.ventajasTitulo
  const ventajasSubtitulo =
    tipo === "arrendatario" ? ct.ventajasArrendatarioSubtitulo : ct.ventajasSubtitulo

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      {/* Modal */}
      <div
        className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-2xl"
        style={{ maxHeight: "92vh" }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header con gradiente teal/verde/cyan */}
        <div
          className="relative shrink-0 px-6 pb-6 pt-6 text-center"
          style={{
            background: "linear-gradient(135deg, #0d9488 0%, #059669 50%, #22d3ee 100%)",
          }}
        >
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          {success ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">{ct.exitoTitulo}</h2>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white md:text-2xl">{ct.titulo}</h2>
              <p className="mt-1 text-sm text-white/90">{ct.subtitulo}</p>
            </>
          )}
        </div>

        {/* Contenido desplazable */}
        <div className="overflow-y-auto px-6 py-6">
          {success ? (
            /* ── Estado de éxito ── */
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="text-slate-600">{ct.exitoDesc}</p>
              <button
                onClick={handleClose}
                className="mt-2 rounded-lg bg-teal-600 px-10 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-teal-700"
              >
                {ct.cerrar}
              </button>
            </div>
          ) : step === 1 ? (
            /* ── Paso 1: Selección de rol ── */
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleRoleSelect("arrendatario")}
                className="flex flex-col items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/80 p-5 text-center transition hover:border-teal-400 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                  <Key className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{ct.esArrendatario}</p>
                  <p className="mt-1 text-xs text-slate-500">{ct.esArrendatarioDesc}</p>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect("propietario")}
                className="flex flex-col items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/80 p-5 text-center transition hover:border-teal-400 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                  <Home className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{ct.esPropietario}</p>
                  <p className="mt-1 text-xs text-slate-500">{ct.esPropietarioDesc}</p>
                </div>
              </button>
            </div>
          ) : step === 2 ? (
            /* ── Paso 2: Ventajas (propietario o arrendatario) ── */
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h3 className="text-base font-bold text-slate-800 md:text-lg">{ventajasTitulo}</h3>
                <p className="mt-1 text-sm text-slate-500">{ventajasSubtitulo}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {ventajas.map(({ icon: Icon, titulo, desc }) => (
                  <div
                    key={titulo}
                    className="rounded-xl border border-teal-200 bg-teal-50/60 p-4"
                  >
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                      <Icon className="h-4 w-4 text-teal-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{titulo}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-teal-700"
              >
                {ct.continuarForm}
              </button>

              <button
                onClick={handleBack}
                className="flex items-center justify-center gap-1.5 text-sm text-slate-500 transition hover:text-teal-700"
              >
                <ArrowLeft className="h-4 w-4" />
                {ct.volver}
              </button>
            </div>
          ) : (
            /* ── Paso 3: Formulario ── */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Volver */}
              <button
                type="button"
                onClick={handleBack}
                className="flex w-fit items-center gap-1.5 text-sm text-slate-500 transition hover:text-teal-700"
              >
                <ArrowLeft className="h-4 w-4" />
                {ct.volver}
              </button>

              {/* Nombre */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {ct.nombreCompleto} <span className="text-teal-600">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={ct.nombreCompleto}
                  className="w-full rounded-lg border border-teal-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/40"
                />
              </div>

              {/* Celular */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {ct.celular} <span className="text-teal-600">*</span>
                </label>
                <input
                  type="tel"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  placeholder={ct.celular}
                  className="w-full rounded-lg border border-teal-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/40"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {ct.emailLabel} <span className="text-teal-600">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={ct.emailLabel}
                  className="w-full rounded-lg border border-teal-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/40"
                />
              </div>

              {/* Política de datos */}
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={autorizado}
                  onChange={(e) => setAutorizado(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-teal-300 accent-teal-600"
                />
                <span className="text-xs leading-relaxed text-slate-600">
                  {ct.politicaTexto}{" "}
                  <Link
                    href="/politica-datos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 underline underline-offset-2 transition hover:text-teal-700"
                  >
                    {ct.politicaLink}
                  </Link>
                  .
                </span>
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? ct.enviando : ct.enviar}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
