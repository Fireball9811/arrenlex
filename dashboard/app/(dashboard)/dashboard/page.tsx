export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">
        Panel Principal
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-sm text-gray-500">Arrendatarios</h2>
          <p className="mt-2 text-2xl font-bold">24</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-sm text-gray-500">Contratos Activos</h2>
          <p className="mt-2 text-2xl font-bold">18</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-sm text-gray-500">Ingresos Mensuales</h2>
          <p className="mt-2 text-2xl font-bold">$12,400</p>
        </div>
      </div>
    </div>
  )
}
