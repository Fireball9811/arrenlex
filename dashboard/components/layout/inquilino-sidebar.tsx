"use client"

import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { UserEmail } from "@/components/auth/user-email"

export function InquilinoSidebar() {
  return (
    <aside className="flex w-64 flex-col bg-gray-900 text-white">
      <Link href="/inquilino/dashboard" className="flex items-center gap-2 border-b border-gray-700 p-6">
        <Image src="/Logo.png" alt="Arrenlex" width={180} height={60} className="h-12 w-auto" />
      </Link>
      <nav className="flex-1 space-y-2 p-4">
        <Link href="/inquilino/dashboard" className="block rounded p-2 transition hover:bg-gray-800">
          Dashboard
        </Link>
        <Link href="/inquilino/mis-datos" className="block rounded p-2 transition hover:bg-gray-800">
          Mis datos
        </Link>
        <Link href="/inquilino/mis-contratos" className="block rounded p-2 transition hover:bg-gray-800">
          Mis Contratos
        </Link>
        <Link href="/catalogo" className="block rounded p-2 transition hover:bg-gray-800">
          Ver Propiedades
        </Link>
        <Link href="/inquilino/pagos" className="block rounded p-2 transition hover:bg-gray-800">
          Mis Pagos
        </Link>
        <Link href="/mantenimiento" className="block rounded p-2 transition hover:bg-gray-800">
          Mantenimiento
        </Link>
      </nav>
      <div className="space-y-2 border-t border-gray-700 p-4">
        <Link href="/cambio-contrasena" className="block rounded p-2 text-left text-sm text-white transition hover:bg-gray-800">
          Cambio de contraseña
        </Link>
        <SignOutButton>Cerrar sesión</SignOutButton>
      </div>
    </aside>
  )
}
