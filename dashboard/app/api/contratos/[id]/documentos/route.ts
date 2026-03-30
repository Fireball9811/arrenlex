import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

type DocumentoContrato = {
  id: string
  contrato_id: string
  nombre: string
  tipo: string
  url: string
  subido_por: string
  created_at: string
  updated_at: string
}

// GET - Listar documentos de un contrato
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id
  console.log("🔵 [documentos-contrato] GET - contrato:", contratoId)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("❌ No hay usuario autenticado")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Obtener el rol del usuario
  const role = await getUserRole(supabase, user)
  console.log("✓ Rol:", role)

  const admin = createAdminClient()

  // Verificar que el contrato existe y el usuario tiene acceso
  const { data: contrato, error: contratoError } = await admin
    .from("contratos")
    .select(`
      id,
      user_id,
      arrendatario_id,
      arrendatario:arrendatarios!inner(id, user_id)
    `)
    .eq("id", contratoId)
    .single()

  if (contratoError || !contrato) {
    console.log("❌ Contrato no encontrado")
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  // Verificar permisos:
  // - Admin: puede ver todos
  // - Propietario: solo sus contratos
  // - Inquilino: solo sus contratos (por email/cédula)
  let tieneAcceso = role === "admin"

  if (!tieneAcceso && role === "propietario") {
    tieneAcceso = contrato.user_id === user.id
  }

  if (!tieneAcceso && role === "inquilino") {
    // arrendatario es un array, tomamos el primer elemento
    const arrendatario = Array.isArray(contrato.arrendatario) ? contrato.arrendatario[0] : contrato.arrendatario
    tieneAcceso = arrendatario?.user_id === user.id
  }

  if (!tieneAcceso) {
    console.log("❌ Sin acceso al contrato")
    return NextResponse.json({ error: "No tienes acceso a este contrato" }, { status: 403 })
  }

  // Obtener documentos del contrato, ordenados del más reciente al más antiguo
  const { data: documentos, error } = await admin
    .from("documentos_contratos")
    .select("*")
    .eq("contrato_id", contratoId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("❌ Error obteniendo documentos:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log("✓ Documentos encontrados:", documentos?.length || 0)
  return NextResponse.json(documentos ?? [])
}

// POST - Subir un documento a un contrato
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const contratoId = (await params).id
  console.log("🔵 [documentos-contrato] POST - contrato:", contratoId)

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

  // Verificar que el contrato existe
  const { data: contrato, error: contratoError } = await admin
    .from("contratos")
    .select("id, user_id")
    .eq("id", contratoId)
    .single()

  if (contratoError || !contrato) {
    console.log("❌ Contrato no encontrado")
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  // Verificar permisos: solo admin y propietario del contrato pueden subir
  let puedeSubir = role === "admin"

  if (!puedeSubir && role === "propietario") {
    puedeSubir = contrato.user_id === user.id
  }

  if (!puedeSubir) {
    console.log("❌ Sin permiso para subir documentos")
    return NextResponse.json({ error: "No tienes permiso para subir documentos a este contrato" }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("archivo") as File

    if (!file) {
      console.log("❌ No se proporcionó archivo")
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ]

    if (!allowedTypes.includes(file.type)) {
      console.log("❌ Tipo de archivo no permitido:", file.type)
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo PDF, Word, JPG y PNG" },
        { status: 400 }
      )
    }

    // Validar tamaño (máx 40MB)
    const maxSize = 40 * 1024 * 1024 // 40MB
    if (file.size > maxSize) {
      console.log("❌ Archivo demasiado grande:", file.size)
      return NextResponse.json(
        { error: "El archivo supera el tamaño máximo de 40MB" },
        { status: 400 }
      )
    }

    // Generar nombre único para el archivo
    const extension = file.name.split(".").pop()
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const storagePath = `contratos/${contratoId}/${fileName}`

    // Subir archivo a storage
    console.log("✓ Subiendo archivo a storage:", storagePath)

    // Crear un array con los bytes del archivo
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("❌ Error subiendo archivo:", uploadError)
      return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 })
    }

    console.log("✓ Archivo subido:", uploadData.path)

    // Crear registro en la base de datos
    const { data: documento, error: dbError } = await admin
      .from("documentos_contratos")
      .insert({
        contrato_id: contratoId,
        nombre: file.name,
        tipo: file.type,
        url: uploadData.path,
        subido_por: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error("❌ Error creando registro:", dbError)
      // Intentar eliminar el archivo subido
      await supabase.storage.from("documentos").remove([storagePath])
      return NextResponse.json({ error: "Error al guardar el documento" }, { status: 500 })
    }

    console.log("✓ Documento creado:", documento.id)
    return NextResponse.json(documento, { status: 201 })
  } catch (error) {
    console.error("❌ Error procesando solicitud:", error)
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 })
  }
}
