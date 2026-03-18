import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"

// DELETE - Eliminar un documento de un contrato
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; documentoId: string }> }
) {
  const contratoId = (await params).id
  const documentoId = (await params).documentoId

  console.log("🔵 [documentos-contrato] DELETE - contrato:", contratoId, "documento:", documentoId)

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

  // Verificar permisos: solo admin y propietario del contrato pueden eliminar
  let puedeEliminar = role === "admin"

  if (!puedeEliminar && role === "propietario") {
    puedeEliminar = contrato.user_id === user.id
  }

  if (!puedeEliminar) {
    console.log("❌ Sin permiso para eliminar documentos")
    return NextResponse.json({ error: "No tienes permiso para eliminar este documento" }, { status: 403 })
  }

  // Obtener el documento para saber la ruta del archivo
  const { data: documento, error: docError } = await admin
    .from("documentos_contratos")
    .select("url")
    .eq("id", documentoId)
    .eq("contrato_id", contratoId)
    .single()

  if (docError || !documento) {
    console.log("❌ Documento no encontrado")
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })
  }

  // Eliminar el registro de la base de datos
  const { error: deleteError } = await admin
    .from("documentos_contratos")
    .delete()
    .eq("id", documentoId)
    .eq("contrato_id", contratoId)

  if (deleteError) {
    console.error("❌ Error eliminando registro:", deleteError)
    return NextResponse.json({ error: "Error al eliminar el documento" }, { status: 500 })
  }

  // Eliminar el archivo del storage
  const { error: storageError } = await supabase.storage
    .from("documentos")
    .remove([documento.url])

  if (storageError) {
    console.warn("⚠️ Error eliminando archivo del storage:", storageError)
    // No fallamos el proceso si no se puede eliminar el archivo del storage
    // El registro ya fue eliminado de la base de datos
  }

  console.log("✓ Documento eliminado")
  return NextResponse.json({ success: true })
}

// GET - Obtener URL firmada para descargar un documento
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; documentoId: string }> }
) {
  const contratoId = (await params).id
  const documentoId = (await params).documentoId

  console.log("🔵 [documentos-contrato] GET download - contrato:", contratoId, "documento:", documentoId)

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

  // Verificar que el contrato existe y el usuario tiene acceso
  const { data: contrato, error: contratoError } = await admin
    .from("contratos")
    .select(`
      id,
      user_id,
      arrendatario_id,
      arrendatario:arrendatarios(id)
    `)
    .eq("id", contratoId)
    .single()

  if (contratoError || !contrato) {
    console.log("❌ Contrato no encontrado")
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 })
  }

  // Verificar permisos
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
    return NextResponse.json({ error: "No tienes acceso a este documento" }, { status: 403 })
  }

  // Obtener el documento
  const { data: documento, error: docError } = await admin
    .from("documentos_contratos")
    .select("*")
    .eq("id", documentoId)
    .eq("contrato_id", contratoId)
    .single()

  if (docError || !documento) {
    console.log("❌ Documento no encontrado")
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })
  }

  // Generar URL firmada válida por 1 hora
  const { data: urlData, error: urlError } = await supabase.storage
    .from("documentos")
    .createSignedUrl(documento.url, 60 * 60) // 1 hora

  if (urlError) {
    console.error("❌ Error generando URL firmada:", urlError)
    return NextResponse.json({ error: "Error al generar URL de descarga" }, { status: 500 })
  }

  console.log("✓ URL generada")
  return NextResponse.json({
    url: urlData.signedUrl,
    nombre: documento.nombre,
    tipo: documento.tipo,
  })
}
