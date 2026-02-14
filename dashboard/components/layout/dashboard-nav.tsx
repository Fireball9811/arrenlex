"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { UserRole } from "@/lib/auth/role"

export function DashboardNav() {
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: UserRole } | null) => {
        if (data?.role) setRole(data.role)
        else setRole("inquilino")
      })
      .catch(() => setRole("inquilino"))
  }, [])

  const isAdmin = role === "admin"
  const isPropietario = role === "propietario"
  const isInquilino = role === "inquilino"

  return (
    <nav className="flex-1 space-y-2 p-4">
      {(isAdmin || isPropietario) && (
        <Link
          href="/dashboard"
          className="block rounded p-2 transition hover:bg-gray-800"
        >
          Dashboard
        </Link>
      )}

      <Link
        href="/nuevo"
        className="block rounded p-2 transition hover:bg-gray-800"
      >
        {isInquilino ? "Mis datos" : "Nuevo Arrendatario"}
      </Link>

      {(isAdmin || isPropietario) && (
        <Link
          href="/propiedades"
          className="block rounded p-2 transition hover:bg-gray-800"
        >
          Propiedades
        </Link>
      )}

      {/* Contratos - para implementar */}
      {(isAdmin || isPropietario) && (
        <Link
          href="#"
          className="block rounded p-2 transition hover:bg-gray-800"
        >
          Contratos
        </Link>
      )}

      {/* Gestión de Pagos - solo para admins y propietarios */}
      {(isAdmin || isPropietario) && (
        <Link
          href="/reportes/gestion-pagos"
          className="block rounded p-2 transition hover:bg-gray-800"
        >
          💰 Gestión de Pagos
        </Link>
      )}

      {/* Reportes - diferente nombre para inquilinos */}
      <Link
        href={isInquilino ? "/reportes/mis-pagos" : "/reportes"}
        className="block rounded p-2 transition hover:bg-gray-800"
      >
        {isInquilino ? "Mis Pagos" : "Reportes"}
      </Link>
    </nav>
  )
}
