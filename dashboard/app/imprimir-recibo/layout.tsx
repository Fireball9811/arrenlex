import { ReactNode } from "react"

export default function ImprimirReciboLayout({ children }: { children: ReactNode }) {
  // Layout completamente vacío - sin sidebar, header, nada
  return <>{children}</>
}
