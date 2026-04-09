"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
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
    <aside className="relative flex w-64 flex-col bg-indigo-900 text-white overflow-hidden">
      {/* Marca de agua */}
      <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
        <Image src="/Logo.png" alt="" width={220} height={220} className="w-48 object-contain" />
      </div>

      <Link href="/propietario/dashboard" className="relative flex items-center gap-2 border-b border-indigo-700 p-6">
        <Image src="/Logo.png" alt="Arrenlex" width={180} height={60} className="h-16 w-auto" />
      </Link>
      <nav className="relative flex-1 space-y-2 p-4">
        <Link href="/propietario/dashboard" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.dashboard}
        </Link>
        <Link href="/propietario/propiedades" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.propiedades}
        </Link>
        <Link href="/propietario/contratos" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.contratos}
        </Link>
        <Link href="/propietario/invitaciones" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.invitaciones}
        </Link>
        <Link href="/propietario/recibos" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.recibos}
        </Link>
        <Link href="/reportes" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.reportes}
        </Link>
        <Link href="/nuevo" className="block rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.nuevoArrendatario}
        </Link>
        <Link href="/mensajes" className="flex items-center justify-between rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.mensajes}
          {pendientesCount > 0 && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {pendientesCount}
            </span>
          )}
        </Link>
        <Link href="/mantenimiento" className="flex items-center justify-between rounded p-2 transition hover:bg-indigo-800">
          {t.sidebar.mantenimiento}
          {mantenimientoPendientesCount > 0 && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {mantenimientoPendientesCount}
            </span>
          )}
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
        <Link href="/propietario/perfil" className="block rounded p-2 text-left text-sm text-white transition hover:bg-indigo-800">
          Mi perfil
        </Link>
        <Link href="/cambio-contrasena" className="block rounded p-2 text-left text-sm text-white transition hover:bg-indigo-800">
          {t.sidebar.cambioContrasena}
        </Link>
        <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
      </div>
    </aside>
  )
}
