import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/role"
import { redirect } from "next/navigation"

export default async function InsuranceDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const role = await getUserRole(supabase, user)
  if (role !== "insurance_special") {
    redirect("/dashboard")
  }

  // Obtener casos de seguros asignados
  const { data: casos } = await supabase
    .from("casos_seguros")
    .select(`
      id,
      tipo,
      descripcion,
      estado,
      fecha_incidente,
      monto_reclamado,
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

  const abiertos = casos?.filter(c => c.estado === "abierto").length ?? 0
  const enProceso = casos?.filter(c => c.estado === "en_proceso").length ?? 0
  const cerrados = casos?.filter(c => c.estado === "cerrado").length ?? 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard de Seguros</h1>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Abiertos</div>
          <div className="text-2xl font-bold text-amber-500">{abiertos}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">En Proceso</div>
          <div className="text-2xl font-bold text-blue-500">{enProceso}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Cerrados</div>
          <div className="text-2xl font-bold text-green-500">{cerrados}</div>
        </div>
      </div>

      {/* Lista de casos */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Mis Casos Asignados</h2>
        </div>
        <div className="divide-y">
          {casos && casos.length > 0 ? (
            casos.map((caso) => (
              <div key={caso.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium capitalize">{caso.tipo.replace("_", " ")}</div>
                    <div className="text-sm text-gray-500">
                      {caso.propiedades?.[0]?.direccion} - {caso.propiedades?.[0]?.ciudad}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{caso.descripcion}</div>
                    {caso.monto_reclamado && (
                      <div className="text-sm font-medium text-gray-700 mt-1">
                        Monto: ${Number(caso.monto_reclamado).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    caso.estado === "abierto" ? "bg-amber-100 text-amber-700" :
                    caso.estado === "en_proceso" ? "bg-blue-100 text-blue-700" :
                    caso.estado === "cerrado" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {caso.estado === "abierto" ? "Abierto" :
                     caso.estado === "en_proceso" ? "En Proceso" :
                     caso.estado === "cerrado" ? "Cerrado" :
                     caso.estado}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No tienes casos asignados
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
