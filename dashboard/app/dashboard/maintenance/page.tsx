import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/role"
import { redirect } from "next/navigation"

export default async function MaintenanceDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const role = await getUserRole(supabase, user)
  if (role !== "maintenance_special") {
    redirect("/dashboard")
  }

  // Obtener solicitudes de mantenimiento asignadas
  const { data: solicitudes } = await supabase
    .from("solicitudes_mantenimiento")
    .select(`
      id,
      propiedad_id,
      nombre_completo,
      detalle,
      desde_cuando,
      status,
      created_at,
      propiedades (
        id,
        direccion,
        ciudad,
        barrio
      )
    `)
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false })

  const pendientes = solicitudes?.filter(s => s.status === "pendiente").length ?? 0
  const enProgreso = solicitudes?.filter(s => s.status === "ejecucion").length ?? 0
  const completados = solicitudes?.filter(s => s.status === "completado").length ?? 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard de Mantenimiento</h1>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Pendientes</div>
          <div className="text-2xl font-bold text-amber-500">{pendientes}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">En Progreso</div>
          <div className="text-2xl font-bold text-blue-500">{enProgreso}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Completados</div>
          <div className="text-2xl font-bold text-green-500">{completados}</div>
        </div>
      </div>

      {/* Lista de solicitudes */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Mis Solicitudes Asignadas</h2>
        </div>
        <div className="divide-y">
          {solicitudes && solicitudes.length > 0 ? (
            solicitudes.map((solicitud) => (
              <div key={solicitud.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{solicitud.nombre_completo}</div>
                    <div className="text-sm text-gray-500">
                      {solicitud.propiedades?.direccion} - {solicitud.propiedades?.ciudad}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{solicitud.detalle}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    solicitud.status === "pendiente" ? "bg-amber-100 text-amber-700" :
                    solicitud.status === "ejecucion" ? "bg-blue-100 text-blue-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {solicitud.status === "pendiente" ? "Pendiente" :
                     solicitud.status === "ejecucion" ? "En Progreso" :
                     "Completado"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No tienes solicitudes asignadas
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
