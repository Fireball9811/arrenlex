import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserRole } from "@/lib/auth/role"
import { sortPropiedadesByOrden } from "@/lib/propiedades/orden-query"

type ContactoResumen = {
  nombre: string
  cedula: string
  email: string | null
  telefono: string | null
}

function mapArrendatario(row: {
  nombre: string
  cedula: string
  email: string | null
  telefono: string | null
  celular: string | null
}): ContactoResumen {
  return {
    nombre: row.nombre,
    cedula: row.cedula,
    email: row.email,
    telefono: row.telefono || row.celular || null,
  }
}

function mapCoarrendatario(row: {
  coarrendatario_nombre: string | null
  coarrendatario_cedula: string | null
  coarrendatario_email: string | null
  coarrendatario_telefono: string | null
}): ContactoResumen | null {
  if (!row.coarrendatario_nombre && !row.coarrendatario_cedula) return null
  return {
    nombre: row.coarrendatario_nombre || "",
    cedula: row.coarrendatario_cedula || "",
    email: row.coarrendatario_email,
    telefono: row.coarrendatario_telefono,
  }
}

/**
 * GET /api/propietario/propiedades-resumen
 * Lista propiedades del propietario con arrendatarios del contrato activo.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const role = await getUserRole(supabase, user)
  if (role !== "propietario") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  }

  const admin = createAdminClient()

  // select("*") incluye todas las propiedades existentes del propietario,
  // con o sin columna orden_display aplicada en la BD.
  const { data: propiedades, error: propError } = await admin
    .from("propiedades")
    .select("*")
    .eq("user_id", user.id)

  if (propError) {
    console.error("[propiedades-resumen GET]", propError)
    return NextResponse.json({ error: "Error al obtener propiedades" }, { status: 500 })
  }

  const sorted = sortPropiedadesByOrden(
    (propiedades ?? []).map((p) => ({
      ...p,
      orden_display: (p as { orden_display?: number | null }).orden_display ?? null,
    }))
  )
  const propiedadIds = sorted.map((p) => p.id)

  if (propiedadIds.length === 0) {
    return NextResponse.json([])
  }

  const { data: contratos, error: contratosError } = await admin
    .from("contratos")
    .select(`
      id,
      propiedad_id,
      arrendatario:arrendatarios(
        nombre,
        cedula,
        email,
        telefono,
        celular,
        coarrendatario_nombre,
        coarrendatario_cedula,
        coarrendatario_email,
        coarrendatario_telefono
      )
    `)
    .eq("user_id", user.id)
    .eq("estado", "activo")
    .in("propiedad_id", propiedadIds)

  if (contratosError) {
    // No bloquear el listado: mostrar todas las propiedades aunque falle el join de contratos
    console.error("[propiedades-resumen GET contratos]", contratosError)
  }

  const contratoPorPropiedad = new Map<
    string,
    {
      id: string
      arrendatario: ContactoResumen | null
      coarrendatario: ContactoResumen | null
    }
  >()

  type ArrendatarioRow = {
    nombre: string
    cedula: string
    email: string | null
    telefono: string | null
    celular: string | null
    coarrendatario_nombre: string | null
    coarrendatario_cedula: string | null
    coarrendatario_email: string | null
    coarrendatario_telefono: string | null
  }

  for (const contrato of contratos ?? []) {
    const raw = contrato.arrendatario
    const arr: ArrendatarioRow | null = Array.isArray(raw)
      ? (raw[0] as ArrendatarioRow | undefined) ?? null
      : (raw as ArrendatarioRow | null)

    contratoPorPropiedad.set(contrato.propiedad_id, {
      id: contrato.id,
      arrendatario: arr ? mapArrendatario(arr) : null,
      coarrendatario: arr ? mapCoarrendatario(arr) : null,
    })
  }

  const resultado = sorted.map((p) => {
    const row = p as {
      id: string
      titulo?: string | null
      direccion: string
      ciudad: string
      orden_display?: number | null
    }
    const contrato = contratoPorPropiedad.get(row.id)
    return {
      id: row.id,
      titulo: row.titulo ?? null,
      direccion: row.direccion,
      ciudad: row.ciudad,
      orden_display: row.orden_display ?? null,
      contrato_activo_id: contrato?.id ?? null,
      arrendatario: contrato?.arrendatario ?? null,
      coarrendatario: contrato?.coarrendatario ?? null,
    }
  })

  console.log(
    `[propiedades-resumen] ${resultado.length} propiedades para user ${user.id}`
  )

  return NextResponse.json(resultado)
}
