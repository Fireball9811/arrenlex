"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { AdjuntarDocumentos } from "@/components/layout/adjuntar-documentos"
import { useLang } from "@/lib/i18n/context"

export function PropietarioSidebar() {
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
    <aside className="flex w-64 flex-col bg-gray-900 text-white">
      <Link href="/propietario/dashboard" className="flex items-center gap-2 border-b border-gray-700 p-6">
        <Image src="/Logo.png" alt="Arrenlex" width={180} height={60} className="h-16 w-auto" />
      </Link>
      <nav className="flex-1 space-y-2 p-4">
        <Link href="/propietario/dashboard" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.dashboard}
        </Link>
        <Link href="/propietario/propiedades" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.propiedades}
        </Link>
        <Link href="/propietario/contratos" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.contratos}
        </Link>
        <Link href="/propietario/invitaciones" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.invitaciones}
        </Link>
        <Link href="/propietario/reportes/gestion-pagos" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.gestionPagos}
        </Link>
        <Link href="/propietario/recibos" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.recibos}
        </Link>
        <Link href="/propietario/reportes" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.reportes}
        </Link>
        <Link href="/nuevo" className="block rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.nuevoArrendatario}
        </Link>
        <Link href="/mensajes" className="flex items-center justify-between rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.mensajes}
          {pendientesCount > 0 && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {pendientesCount}
            </span>
          )}
        </Link>
        <Link href="/mantenimiento" className="flex items-center justify-between rounded p-2 transition hover:bg-gray-800">
          {t.sidebar.mantenimiento}
          {mantenimientoPendientesCount > 0 && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {mantenimientoPendientesCount}
            </span>
          )}
        </Link>
      </nav>
      <div className="space-y-2 border-t border-gray-700 p-4">
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="flex w-full items-center justify-center gap-1 rounded p-2 text-xs font-semibold text-gray-400 transition hover:bg-gray-800 hover:text-white"
        >
          <span className={lang === "es" ? "text-white" : "text-gray-500"}>ES</span>
          <span className="text-gray-600">|</span>
          <span className={lang === "en" ? "text-white" : "text-gray-500"}>EN</span>
        </button>
        <Link href="/cambio-contrasena" className="block rounded p-2 text-left text-sm text-white transition hover:bg-gray-800">
          {t.sidebar.cambioContrasena}
        </Link>
        <AdjuntarDocumentos sidebar />
        <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
      </div>
    </aside>
  )
}
