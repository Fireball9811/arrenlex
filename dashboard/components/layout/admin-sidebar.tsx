"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { UserEmail } from "@/components/auth/user-email"
import { AdjuntarDocumentos } from "@/components/layout/adjuntar-documentos"

export function AdminSidebar() {
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
      <Link href="/admin/dashboard" className="flex items-center gap-2 border-b border-gray-700 p-6">
        <Image src="/Logo.png" alt="Arrenlex" width={180} height={60} className="h-12 w-auto" />
      </Link>
      <nav className="flex-1 space-y-2 p-4">
        <Link href="/admin/dashboard" className="block rounded p-2 transition hover:bg-gray-800">
          Dashboard
        </Link>
        <Link href="/admin/usuarios" className="block rounded p-2 transition hover:bg-gray-800">
          Usuarios
        </Link>
        <Link href="/admin/reportes" className="block rounded p-2 transition hover:bg-gray-800">
          Reportes
        </Link>
        <Link href="/admin/reportes/gestion-pagos" className="block rounded p-2 transition hover:bg-gray-800">
          Gestión de Pagos
        </Link>
        <Link href="/mensajes" className="flex items-center justify-between rounded p-2 transition hover:bg-gray-800">
          Mensajes
          {pendientesCount > 0 && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {pendientesCount}
            </span>
          )}
        </Link>
        <Link href="/mantenimiento" className="flex items-center justify-between rounded p-2 transition hover:bg-gray-800">
          Mantenimiento
          {mantenimientoPendientesCount > 0 && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {mantenimientoPendientesCount}
            </span>
          )}
        </Link>
      </nav>
      <div className="space-y-2 border-t border-gray-700 p-4">
        <Link href="/cambio-contrasena" className="block rounded p-2 text-left text-sm text-white transition hover:bg-gray-800">
          Cambio de contraseña
        </Link>
        <AdjuntarDocumentos sidebar />
        <SignOutButton>Cerrar sesión</SignOutButton>
      </div>
    </aside>
  )
}
