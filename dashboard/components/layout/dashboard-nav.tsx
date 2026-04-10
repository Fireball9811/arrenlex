"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { BarChart3, User, FileText, Home, Building2, FileCheck, Mail, CreditCard, MessageSquare, Wrench } from "lucide-react"
import type { UserRole } from "@/lib/auth/role"
import { getDashboardPathByRole } from "@/lib/auth/redirect-by-role"
import { useLang } from "@/lib/i18n/context"

const ROLE_CACHE_KEY = "arrenlex_user_role"

export function DashboardNav() {
  const { t } = useLang()
  const [role, setRole] = useState<UserRole | null>(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem(ROLE_CACHE_KEY) as UserRole) ?? null
    }
    return null
  })
  const [pendientesCount, setPendientesCount] = useState<number>(0)
  const [intakeCount, setIntakeCount] = useState<number>(0)
  const [mantenimientoPendientesCount, setMantenimientoPendientesCount] = useState<number>(0)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: UserRole } | null) => {
        const r: UserRole = data?.role ?? "inquilino"
        setRole(r)
        sessionStorage.setItem(ROLE_CACHE_KEY, r)
      })
      .catch(() => {
        setRole("inquilino")
        sessionStorage.setItem(ROLE_CACHE_KEY, "inquilino")
      })
  }, [])

  const fetchCounts = useCallback(async () => {
    if (role !== "admin" && role !== "propietario") return

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
  }, [role])

  // Cargar cuando cambia el role
  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  // Recargar cada 30 segundos
  useEffect(() => {
    if (role !== "admin" && role !== "propietario") return
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [fetchCounts, role])

  // Recargar cuando la ventana gana foco
  useEffect(() => {
    if (role !== "admin" && role !== "propietario") return
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCounts()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [fetchCounts, role])

  const isAdmin = role === "admin"
  const isPropietario = role === "propietario"
  const isInquilino = role === "inquilino"

  const linkClass = "flex items-center gap-2 rounded p-2 transition hover:bg-gray-800 [&_svg]:size-5 [&_svg]:shrink-0"

  const dashboardHref = role ? getDashboardPathByRole(role) : "/dashboard"

  return (
    <nav className="flex-1 space-y-2 p-4">
      {(isAdmin || isPropietario) && (
        <Link href={dashboardHref} className={linkClass}>
          <BarChart3 />
          {t.sidebar.dashboard}
        </Link>
      )}

      <Link href="/nuevo" className={linkClass}>
        <User />
        {isInquilino ? t.sidebar.misDatos : t.sidebar.nuevoArrendatario}
      </Link>

      {isInquilino && (
        <Link href="/mis-contratos" className={linkClass}>
          <FileText />
          {t.sidebar.misContratos}
        </Link>
      )}

      {isInquilino && (
        <Link href="/catalogo" className={linkClass}>
          <Home />
          {t.sidebar.verPropiedades}
        </Link>
      )}

      {(isAdmin || isPropietario) && (
        <Link href="/propiedades" className={linkClass}>
          <Building2 />
          {t.sidebar.propiedades}
        </Link>
      )}

      {(isAdmin || isPropietario) && (
        <Link href="/contratos" className={linkClass}>
          <FileCheck />
          {t.sidebar.contratos}
        </Link>
      )}

      {(isAdmin || isPropietario) && (
        <Link href="/invitaciones" className={linkClass}>
          <Mail />
          {t.sidebar.invitaciones}
        </Link>
      )}

      {(isAdmin || isPropietario) && (
        <Link href="/mensajes" className={linkClass}>
          <MessageSquare />
          {t.sidebar.mensajes}
          {(pendientesCount + intakeCount) > 0 && (
            <span className="ml-auto rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {pendientesCount + intakeCount}
            </span>
          )}
        </Link>
      )}

      <Link href="/mantenimiento" className={linkClass}>
        <Wrench />
        {t.sidebar.mantenimiento}
        {(isAdmin || isPropietario) && mantenimientoPendientesCount > 0 && (
          <span className="ml-auto rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
            {mantenimientoPendientesCount}
          </span>
        )}
      </Link>

      {isAdmin && (
        <Link href="/reportes/gestion-pagos" className={linkClass}>
          <CreditCard />
          {t.sidebar.gestionPagos}
        </Link>
      )}

      <Link href={isInquilino ? "/reportes/mis-pagos" : "/reportes"} className={linkClass}>
        <BarChart3 />
        {isInquilino ? t.sidebar.misPagos : t.sidebar.reportes}
      </Link>
    </nav>
  )
}
