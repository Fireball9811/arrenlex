import { Suspense } from "react"
import VistaPreviaReciboContent from "./vista-previa-content"

export default function VistaPreviaReciboPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    }>
      <VistaPreviaReciboContent />
    </Suspense>
  )
}
