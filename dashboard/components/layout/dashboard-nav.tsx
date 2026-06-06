"use client"

import Link from "next/link"
import { BarChart3, User, Building2, FileCheck, Mail, CreditCard, MessageSquare, Wrench } from "lucide-react"
import { getDashboardPathByRole } from "@/lib/auth/redirect-by-role"
import { useLang } from "@/lib/i18n/context"
import { useAuth } from "@/components/auth/auth-provider"
import { useNavCounts } from "@/lib/hooks/use-nav-counts"

export function DashboardNav() {
  const { t } = useLang()
  const { user } = useAuth()
  const role = user?.role ?? null
  const countsEnabled = role === "admin" || role === "propietario"
  const { solicitudes, intake, mantenimiento } = useNavCounts(countsEnabled)

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
        <Link href={isAdmin ? "/admin/mensajes" : "/propietario/mensajes"} className={linkClass}>
          <MessageSquare />
          {t.sidebar.mensajes}
          {(solicitudes + intake) > 0 && (
            <span className="ml-auto rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {solicitudes + intake}
            </span>
          )}
        </Link>
      )}

      {(isAdmin || isPropietario || isInquilino || role === "maintenance_special") && (
        <Link
          href={
            isAdmin ? "/admin/mantenimiento"
            : isPropietario ? "/propietario/mantenimiento"
            : isInquilino ? "/inquilino/mantenimiento"
            : "/dashboard/maintenance"
          }
          className={linkClass}
        >
          <Wrench />
          {t.sidebar.mantenimiento}
          {(isAdmin || isPropietario) && mantenimiento > 0 && (
            <span className="ml-auto rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {mantenimiento}
            </span>
          )}
        </Link>
      )}

      {isAdmin && (
        <Link href="/admin/reportes/gestion-pagos" className={linkClass}>
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
