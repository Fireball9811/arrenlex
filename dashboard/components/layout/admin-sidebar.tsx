"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { useLang } from "@/lib/i18n/context"
import {
  UserPlus,
  Building,
  FileText,
  Mail,
  MessageSquare,
  DollarSign,
  Wrench,
  BarChart3,
  Home
} from "lucide-react"

export function AdminSidebar() {
  const { t, lang, setLang } = useLang()
  const [pendientesCount, setPendientesCount] = useState(0)
  const [mantenimientoPendientesCount, setMantenimientoPendientesCount] = useState(0)

  useEffect(() => {
    fetch("/api/solicitudes-visita/count")
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data: { count?: number }) => setPendientesCount(Number(data?.count) || 0))
      .catch(() => setPendientesCount(0))
  }, [])

  useEffect(() => {
    fetch("/api/mantenimiento/count")
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data: { count?: number }) => setMantenimientoPendientesCount(Number(data?.count) || 0))
      .catch(() => setMantenimientoPendientesCount(0))
  }, [])

  return (
    <aside className="relative flex w-64 flex-col bg-sky-100 text-sky-900 overflow-hidden">
      {/* Marca de agua */}
      <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.12]">
        <Image src="/Logo2.png" alt="" width={220} height={220} className="w-48 object-contain" />
      </div>

      <Link href="/admin/dashboard" className="relative flex justify-center border-b border-sky-300 py-4">
        <Image src="/Logo2.png" alt="Arrenlex" width={720} height={240} className="h-64 w-auto" />
      </Link>
      <nav className="relative flex-1 space-y-2 p-4">
        <Link href="/admin/dashboard" className="flex items-center gap-3 rounded p-2 transition hover:bg-sky-200">
          <Home className="h-4 w-4" />
          {t.sidebar.dashboard}
        </Link>
        <Link href="/nuevo" className="flex items-center gap-3 rounded p-2 transition hover:bg-sky-200">
          <UserPlus className="h-4 w-4" />
          {t.sidebar.nuevoArrendatario}
        </Link>
        <Link href="/admin/propiedades" className="flex items-center gap-3 rounded p-2 transition hover:bg-sky-200">
          <Building className="h-4 w-4" />
          {t.sidebar.propiedades}
        </Link>
        <Link href="/contratos" className="flex items-center gap-3 rounded p-2 transition hover:bg-sky-200">
          <FileText className="h-4 w-4" />
          {t.sidebar.contratos}
        </Link>
        <Link href="/invitaciones" className="flex items-center gap-3 rounded p-2 transition hover:bg-sky-200">
          <Mail className="h-4 w-4" />
          {t.sidebar.invitaciones}
        </Link>
        <Link href="/admin/mensajes" className="flex items-center justify-between rounded p-2 transition hover:bg-sky-200">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4" />
            {t.sidebar.mensajes}
          </div>
          {pendientesCount > 0 && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {pendientesCount}
            </span>
          )}
        </Link>
        <Link href="/admin/reportes/gestion-pagos" className="flex items-center gap-3 rounded p-2 transition hover:bg-sky-200">
          <DollarSign className="h-4 w-4" />
          {t.sidebar.gestionPagos}
        </Link>
        <Link href="/admin/mantenimiento" className="flex items-center justify-between rounded p-2 transition hover:bg-sky-200">
          <div className="flex items-center gap-3">
            <Wrench className="h-4 w-4" />
            {t.sidebar.mantenimiento}
          </div>
          {mantenimientoPendientesCount > 0 && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {mantenimientoPendientesCount}
            </span>
          )}
        </Link>
        <Link href="/admin/otros-gastos" className="flex items-center gap-3 rounded p-2 transition hover:bg-sky-200">
          <DollarSign className="h-4 w-4" />
          {t.sidebar.otrosGastos}
        </Link>
        <Link href="/admin/reportes" className="flex items-center gap-3 rounded p-2 transition hover:bg-sky-200">
          <BarChart3 className="h-4 w-4" />
          {t.sidebar.reportes}
        </Link>
      </nav>
      <div className="relative space-y-2 border-t border-sky-300 p-4">
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="flex w-full items-center justify-center gap-1 rounded p-2 text-xs font-semibold text-sky-600 transition hover:bg-sky-200 hover:text-sky-900"
        >
          <span className={lang === "es" ? "text-sky-900" : "text-sky-500"}>ES</span>
          <span className="text-sky-400">|</span>
          <span className={lang === "en" ? "text-sky-900" : "text-sky-500"}>EN</span>
        </button>
        <Link href="/cambio-contrasena" className="block rounded p-2 text-left text-sm text-sky-900 transition hover:bg-sky-200">
          {t.sidebar.cambioContrasena}
        </Link>
        <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
      </div>
    </aside>
  )
}
