"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { useLang } from "@/lib/i18n/context"

export function PropietarioSidebar() {
  const { t, lang, setLang } = useLang()
  const [pendientesCount, setPendientesCount] = useState(0)
  const [intakeCount, setIntakeCount] = useState(0)
  const [mantenimientoPendientesCount, setMantenimientoPendientesCount] = useState(0)

  const fetchCounts = useCallback(async () => {
    // Cargar todos los contadores en paralelo
    const [solicitudesRes, intakeRes, mantenimientoRes] = await Promise.all([
      fetch("/api/solicitudes-visita/count"),
      fetch("/api/intake/count"),
      fetch("/api/mantenimiento/count"),
    ])

    const solicitudesData = solicitudesRes.ok ? await solicitudesRes.json() : { count: 0 }
    const intakeData = intakeRes.ok ? await intakeRes.json() : { count: 0 }
    const mantenimientoData = mantenimientoRes.ok ? await mantenimientoRes.json() : { count: 0 }

    setPendientesCount(Number(solicitudesData?.count) || 0)
    setIntakeCount(Number(intakeData?.count) || 0)
    setMantenimientoPendientesCount(Number(mantenimientoData?.count) || 0)
  }, [])

  // Cargar al montar
  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  // Recargar cada 30 segundos
  useEffect(() => {
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [fetchCounts])

  // Recargar cuando la ventana gana foco (usuario vuelve a la pestaña)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCounts()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [fetchCounts])

  return (
    <aside className="relative flex w-64 flex-col bg-green-100 text-green-900 overflow-hidden">
      {/* Marca de agua */}
      <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.12]">
        <Image src="/Logo2.png" alt="" width={220} height={220} className="w-48 object-contain" />
      </div>

      <Link href="/propietario/dashboard" className="relative flex items-center gap-2 border-b border-green-300 p-6">
        <Image src="/Logo2.png" alt="Arrenlex" width={180} height={60} className="h-16 w-auto" />
      </Link>
      <nav className="relative flex-1 space-y-2 p-4">
        <Link href="/propietario/dashboard" className="block rounded p-2 transition hover:bg-green-200">
          {t.sidebar.dashboard}
        </Link>
        <Link href="/propietario/propiedades" className="block rounded p-2 transition hover:bg-green-200">
          {t.sidebar.propiedades}
        </Link>
        <Link href="/propietario/contratos" className="block rounded p-2 transition hover:bg-green-200">
          {t.sidebar.contratos}
        </Link>
        <Link href="/propietario/invitaciones" className="block rounded p-2 transition hover:bg-green-200">
          {t.sidebar.invitaciones}
        </Link>
        <Link href="/propietario/recibos" className="block rounded p-2 transition hover:bg-green-200">
          {t.sidebar.recibos}
        </Link>
        <Link href="/reportes" className="block rounded p-2 transition hover:bg-green-200">
          {t.sidebar.reportes}
        </Link>
        <Link href="/nuevo" className="block rounded p-2 transition hover:bg-green-200">
          {t.sidebar.nuevoArrendatario}
        </Link>
        <Link href="/propietario/mensajes" className="flex items-center justify-between rounded p-2 transition hover:bg-green-200">
          {t.sidebar.mensajes}
          {(pendientesCount + intakeCount) > 0 && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {pendientesCount + intakeCount}
            </span>
          )}
        </Link>
        <Link href="/propietario/mantenimiento" className="flex items-center justify-between rounded p-2 transition hover:bg-green-200">
          {t.sidebar.mantenimiento}
          {mantenimientoPendientesCount > 0 && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {mantenimientoPendientesCount}
            </span>
          )}
        </Link>
      </nav>
      <div className="relative space-y-2 border-t border-green-300 p-4">
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="flex w-full items-center justify-center gap-1 rounded p-2 text-xs font-semibold text-green-600 transition hover:bg-green-200 hover:text-green-900"
        >
          <span className={lang === "es" ? "text-green-900" : "text-green-500"}>ES</span>
          <span className="text-green-400">|</span>
          <span className={lang === "en" ? "text-green-900" : "text-green-500"}>EN</span>
        </button>
        <Link href="/propietario/perfil" className="block rounded p-2 text-left text-sm text-green-900 transition hover:bg-green-200">
          Mi perfil
        </Link>
        <Link href="/cambio-contrasena" className="block rounded p-2 text-left text-sm text-green-900 transition hover:bg-green-200">
          {t.sidebar.cambioContrasena}
        </Link>
        <SignOutButton>{t.sidebar.cerrarSesion}</SignOutButton>
      </div>
    </aside>
  )
}
