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
    <aside className="relative flex w-64 flex-col bg-indigo-900 text-white overflow-hidden">
      {/* Marca de agua */}
      <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
        <Image src="/Logo.png" alt="" width={220} height={220} className="w-48 object-contain" />
      </div>

      <Link href="/admin/dashboard" className="relative flex items-center gap-2 border-b border-indigo-700 p-6">
        <Image src="/Logo.png" alt="Arrenlex" width={180} height={60} className="h-16 w-auto" />
      </Link>
      <nav className="relative flex-1 space-y-2 p-4">
        <Link href="/admin/dashboard" className="flex items-center gap-3 rounded p-2 transition hover:bg-indigo-800">
          <Home className="h-4 w-4" />
          {t.sidebar.dashboard}
        </Link>
        <Link href="/nuevo" className="flex items-center gap-3 rounded p-2 transition hover:bg-indigo-800">
          <UserPlus className="h-4 w-4" />
          {t.sidebar.nuevoArrendatario}
        </Link>
        <Link href="/admin/propiedades" className="flex items-center gap-3 rounded p-2 transition hover:bg-indigo-800">
          <Building className="h-4 w-4" />
          {t.sidebar.propiedades}
        </Link>
        <Link href="/contratos" className="flex items-center gap-3 rounded p-2 transition hover:bg-indigo-800">
          <FileText className="h-4 w-4" />
          {t.sidebar.contratos}
        </Link>
        <Link href="/invitaciones" className="flex items-center gap-3 rounded p-2 transition hover:bg-indigo-800">
          <Mail className="h-4 w-4" />
          {t.sidebar.invitaciones}
        </Link>
        <Link href="/admin/mensajes" className="flex items-center justify-between rounded p-2 transition hover:bg-indigo-800">
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
        <Link href="/admin/reportes/gestion-pagos" className="flex items-center gap-3 rounded p-2 transition hover:bg-indigo-800">
          <DollarSign className="h-4 w-4" />
          {t.sidebar.gestionPagos}
        </Link>
        <Link href="/admin/mantenimiento" className="flex items-center justify-between rounded p-2 transition hover:bg-indigo-800">
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
        <Link href="/admin/reportes" className="flex items-center gap-3 rounded p-2 transition hover:bg-indigo-800">
          <BarChart3 className="h-4 w-4" />
          {t.sidebar.reportes}
        </Link>
      </nav>
      <div className="relative space-y-2 border-t border-indigo-700 p-4">
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="flex w-full items-center justify-center gap-1 rounded p-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-800 hover:text-white"
        >
          <span className={lang === "es" ? "text-white" : "text-indigo-400"}>ES</span>
          <span className="text-indigo-600">|</span>
          <span className={lang === "en" ? "text-white" : "text-indigo-400"}>EN</span>
        </button>
        <Link href="/cambio-contrasena" className="block rounded p-2 text-left text-sm text-white transition hover:bg-indigo-800">
          {t.sidebar.cambioContrasena}
        </Link>
        <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
      </div>
    </aside>
  )
}
