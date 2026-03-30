import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

type RegistrarImagenBody = {
  categoria: string
  nombre_archivo: string
  url_publica: string
}

// POST - Registrar una imagen ya subida a Supabase Storage
// Esta API solo guarda la referencia en la base de datos
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const propiedadId = (await params).id
  console.log("🔵 [registrar-imagen] POST - propiedad:", propiedadId)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("❌ No hay usuario autenticado")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  console.log("✓ Rol:", role)

  const admin = createAdminClient()

  // Verificar que la propiedad existe y el usuario tiene acceso
  const { data: propiedad, error: propiedadError } = await admin
    .from("propiedades")
    .select("id, user_id")
    .eq("id", propiedadId)
    .single()

  if (propiedadError || !propiedad) {
    console.log("❌ Propiedad no encontrada")
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 })
  }

  // Verificar permisos: solo admin y propietario pueden registrar imágenes
  let tieneAcceso = role === "admin"

  if (!tieneAcceso && role === "propietario") {
    tieneAcceso = propiedad.user_id === user.id
  }

  if (!tieneAcceso) {
    console.log("❌ Sin acceso a la propiedad")
    return NextResponse.json({ error: "No tienes acceso a esta propiedad" }, { status: 403 })
  }

  try {
    const body: RegistrarImagenBody = await request.json()
    const { categoria, nombre_archivo, url_publica } = body

    // Validar campos requeridos
    if (!categoria || !nombre_archivo || !url_publica) {
      console.log("❌ Campos faltantes")
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Crear registro en la base de datos
    const { data: imagen, error: dbError } = await admin
      .from("propiedades_imagenes")
      .insert({
        propiedad_id: propiedadId,
        categoria,
        nombre_archivo,
        url_publica,
      })
      .select()
      .single()

    if (dbError) {
      console.error("❌ Error creando registro:", dbError)
      return NextResponse.json({ error: "Error al registrar la imagen" }, { status: 500 })
    }

    console.log("✓ Imagen registrada:", imagen.id)
    return NextResponse.json(imagen, { status: 201 })
  } catch (error) {
    console.error("❌ Error procesando solicitud:", error)
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 })
  }
}
