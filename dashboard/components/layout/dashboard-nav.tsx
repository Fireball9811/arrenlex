"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { BarChart3, User, FileText, Home, Building2, FileCheck, Mail, CreditCard, MessageSquare, Wrench } from "lucide-react"
import type { UserRole } from "@/lib/auth/role"

export function DashboardNav() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [pendientesCount, setPendientesCount] = useState<number>(0)
  const [mantenimientoPendientesCount, setMantenimientoPendientesCount] = useState<number>(0)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: UserRole } | null) => {
        if (data?.role) setRole(data.role)
        else setRole("inquilino")
      })
      .catch(() => setRole("inquilino"))
  }, [])

  useEffect(() => {
    if (role !== "admin" && role !== "propietario") return
    fetch("/api/solicitudes-visita/count")
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data: { count?: number }) => setPendientesCount(Number(data?.count) || 0))
      .catch(() => setPendientesCount(0))
  }, [role])

  useEffect(() => {
    if (role !== "admin" && role !== "propietario") return
    fetch("/api/mantenimiento/count")
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data: { count?: number }) => setMantenimientoPendientesCount(Number(data?.count) || 0))
      .catch(() => setMantenimientoPendientesCount(0))
  }, [role])

  const isAdmin = role === "admin"
  const isPropietario = role === "propietario"
  const isInquilino = role === "inquilino"

  const linkClass = "flex items-center gap-2 rounded p-2 transition hover:bg-gray-800 [&_svg]:size-5 [&_svg]:shrink-0"

  return (
    <nav className="flex-1 space-y-2 p-4">
      {(isAdmin || isPropietario) && (
        <Link href="/dashboard" className={linkClass}>
          <BarChart3 />
          Dashboard
        </Link>
      )}

      <Link href="/nuevo" className={linkClass}>
        <User />
        {isInquilino ? "Mis datos" : "Nuevo Arrendatario"}
      </Link>

      {isInquilino && (
        <Link href="/mis-contratos" className={linkClass}>
          <FileText />
          Mis Contratos
        </Link>
      )}

      {isInquilino && (
        <Link href="/catalogo" className={linkClass}>
          <Home />
          Ver Propiedades
        </Link>
      )}

      {(isAdmin || isPropietario) && (
        <Link href="/propiedades" className={linkClass}>
          <Building2 />
          Propiedades
        </Link>
      )}

      {(isAdmin || isPropietario) && (
        <Link href="/contratos" className={linkClass}>
          <FileCheck />
          Contratos
        </Link>
      )}

      {(isAdmin || isPropietario) && (
        <Link href="/invitaciones" className={linkClass}>
          <Mail />
          Invitaciones
        </Link>
      )}

      {(isAdmin || isPropietario) && (
        <Link href="/mensajes" className={linkClass}>
          <MessageSquare />
          Mensajes
          {pendientesCount > 0 && (
            <span className="ml-auto rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {pendientesCount}
            </span>
          )}
        </Link>
      )}

      <Link href="/mantenimiento" className={linkClass}>
        <Wrench />
        Mantenimiento
        {(isAdmin || isPropietario) && mantenimientoPendientesCount > 0 && (
          <span className="ml-auto rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
            {mantenimientoPendientesCount}
          </span>
        )}
      </Link>

      {(isAdmin || isPropietario) && (
        <Link href="/reportes/gestion-pagos" className={linkClass}>
          <CreditCard />
          Gestión de Pagos
        </Link>
      )}

      <Link href={isInquilino ? "/reportes/mis-pagos" : "/reportes"} className={linkClass}>
        <BarChart3 />
        {isInquilino ? "Mis Pagos" : "Reportes"}
      </Link>
    </nav>
  )
}
