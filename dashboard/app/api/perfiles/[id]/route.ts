import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("perfiles")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching perfil:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
  }

  return NextResponse.json({
    id: data.id,
    nombre: data.nombre || "",
    cedula: data.cedula || "",
    cedula_lugar_expedicion: data.cedula_lugar_expedicion || "",
    celular: data.celular || "",
    direccion: data.direccion || "",
    email: data.email || "",
    role: data.role || "",
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (user.id !== id) {
    return NextResponse.json({ error: "Solo puedes editar tu propio perfil" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const allowed = ["nombre", "cedula", "cedula_lugar_expedicion", "celular", "direccion"]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      updates[key] = typeof body[key] === "string" ? (body[key] as string).trim() || null : body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("perfiles")
    .update(updates)
    .eq("id", id)
    .select("id, nombre, cedula, cedula_lugar_expedicion, celular, direccion, email, role")
    .single()

  if (error) {
    console.error("Error actualizando perfil:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
