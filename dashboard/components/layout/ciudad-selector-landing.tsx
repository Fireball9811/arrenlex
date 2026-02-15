"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CiudadSelectorLanding() {
  return (
    <div className="hidden md:block">
      <Button variant="outline" asChild>
        <Link href="/catalogo">Echar un vistazo</Link>
      </Button>
    </div>
  )
}
