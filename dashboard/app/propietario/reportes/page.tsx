"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLang } from "@/lib/i18n/context"

export default function PropietarioReportesPage() {
  const { t } = useLang()

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t.reportes.titulo}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t.reportes.titulo}</CardTitle>
          <CardDescription>{t.reportes.descripcion}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
