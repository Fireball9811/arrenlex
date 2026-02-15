"use client"

import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { UserEmail } from "@/components/auth/user-email"
import { AdjuntarDocumentos } from "@/components/layout/adjuntar-documentos"

export function AdminSidebar() {
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
        <Link href="/mensajes" className="block rounded p-2 transition hover:bg-gray-800">
          Mensajes
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
