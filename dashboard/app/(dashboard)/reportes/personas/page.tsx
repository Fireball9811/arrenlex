"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PersonasPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/reportes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a Reportes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Reportes de Personas</h1>
        <p className="text-muted-foreground">
          Información sobre inquilinos, propietarios y usuarios
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>👥 Inquilinos Activos</CardTitle>
            <CardDescription>Listado de inquilinos con contrato vigente</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">inquilinos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🏠 Propietarios</CardTitle>
            <CardDescription>Listado de propietarios de inmuebles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">12</p>
            <p className="text-sm text-muted-foreground">propietarios</p>
          </CardContent>
        </Card>

        <Link href="/reportes/personas/usuarios">
          <Card className="hover:bg-gray-50 transition cursor-pointer">
            <CardHeader>
              <CardTitle>👤 Usuarios del Sistema</CardTitle>
              <CardDescription>Usuarios registrados en la plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">41</p>
              <p className="text-sm text-muted-foreground">usuarios →</p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>📋 Historial de Inquilinos</CardTitle>
            <CardDescription>Historial completo de todos los inquilinos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Ver listado completo...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📞 Contactos</CardTitle>
            <CardDescription>Información de contacto de todas las personas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Ver directorio...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔑 Roles y Permisos</CardTitle>
            <CardDescription>Gestión de roles de usuarios</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Ver permisos...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
