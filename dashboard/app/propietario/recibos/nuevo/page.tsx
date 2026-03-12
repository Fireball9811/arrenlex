import { Suspense } from "react"
import NuevoReciboPagoContent from "./nuevo-recibo-content"

export default function NuevoReciboPagoPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando...</p>}>
      <NuevoReciboPagoContent />
    </Suspense>
  )
}
