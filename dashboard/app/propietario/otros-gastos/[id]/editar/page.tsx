"use client"

import { useParams } from "next/navigation"
import { EditarOtroGastoForm } from "@/components/otros-gastos/editar-otro-gasto-form"

export default function EditarOtroGastoPropietarioPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  if (!id) return null
  return <EditarOtroGastoForm id={id} basePath="/propietario/otros-gastos" />
}
