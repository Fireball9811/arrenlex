"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FileText, Receipt, DollarSign, Save, Check } from "lucide-react"
import { PropiedadResumenModal } from "@/components/propietario/PropiedadResumenModal"

type ContactoResumen = {
  nombre: string
  cedula: string
  email: string | null
  telefono: string | null
}

export type PropiedadResumenItem = {
  id: string
  titulo: string | null
  direccion: string
  ciudad: string
  orden_display: number | null
  contrato_activo_id: string | null
  arrendatario: ContactoResumen | null
  coarrendatario: ContactoResumen | null
}

interface PropiedadesResumenTableProps {
  aniosAtras: number
  vistaMensual: boolean
}

function dash(value: string | null | undefined) {
  return value && value.trim() ? value : "—"
}

function ContactoCell({ contacto }: { contacto: ContactoResumen | null }) {
  if (!contacto) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="space-y-0.5 text-xs">
      <p className="font-medium">{dash(contacto.nombre)}</p>
      <p>C.C. {dash(contacto.cedula)}</p>
      <p>{dash(contacto.email)}</p>
      <p>{dash(contacto.telefono)}</p>
    </div>
  )
}

export function PropiedadesResumenTable({
  aniosAtras,
  vistaMensual,
}: PropiedadesResumenTableProps) {
  const router = useRouter()
  const [items, setItems] = useState<PropiedadResumenItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ordenDraft, setOrdenDraft] = useState<Record<string, string>>({})
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [guardadoId, setGuardadoId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalPropiedad, setModalPropiedad] = useState<PropiedadResumenItem | null>(null)
  const [sinContratoId, setSinContratoId] = useState<string | null>(null)

  const aplicarItems = useCallback((data: PropiedadResumenItem[]) => {
    setItems(data)
    const draft: Record<string, string> = {}
    for (const item of data) {
      draft[item.id] =
        item.orden_display != null ? String(item.orden_display) : ""
    }
    setOrdenDraft(draft)
  }, [])

  const cargarDesdePropiedadesBase = useCallback(async () => {
    const [propsRes, contratosRes] = await Promise.all([
      fetch("/api/propiedades"),
      fetch("/api/contratos?estado=activo"),
    ])
    if (!propsRes.ok) throw new Error("Error al cargar propiedades")

    const props: Array<{
      id: string
      titulo?: string | null
      direccion: string
      ciudad: string
      orden_display?: number | null
    }> = await propsRes.json()

    const contratos: Array<{
      id: string
      propiedad_id: string
      arrendatario?: {
        nombre: string
        cedula: string
        email: string | null
        telefono?: string | null
        celular?: string | null
        coarrendatario_nombre?: string | null
        coarrendatario_cedula?: string | null
        coarrendatario_email?: string | null
        coarrendatario_telefono?: string | null
      } | null
    }> = contratosRes.ok ? await contratosRes.json() : []

    const contratoPorPropiedad = new Map<string, (typeof contratos)[0]>()
    for (const c of contratos) {
      contratoPorPropiedad.set(c.propiedad_id, c)
    }

    const data: PropiedadResumenItem[] = props.map((p) => {
      const contrato = contratoPorPropiedad.get(p.id)
      const arr = contrato?.arrendatario
      const tieneCoarr = arr?.coarrendatario_nombre || arr?.coarrendatario_cedula
      return {
        id: p.id,
        titulo: p.titulo ?? null,
        direccion: p.direccion,
        ciudad: p.ciudad,
        orden_display: p.orden_display ?? null,
        contrato_activo_id: contrato?.id ?? null,
        arrendatario: arr
          ? {
              nombre: arr.nombre,
              cedula: arr.cedula,
              email: arr.email,
              telefono: arr.telefono || arr.celular || null,
            }
          : null,
        coarrendatario: arr && tieneCoarr
          ? {
              nombre: arr.coarrendatario_nombre || "",
              cedula: arr.coarrendatario_cedula || "",
              email: arr.coarrendatario_email ?? null,
              telefono: arr.coarrendatario_telefono ?? null,
            }
          : null,
      }
    })

    aplicarItems(data)
  }, [aplicarItems])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/propietario/propiedades-resumen")
      if (res.ok) {
        const data: PropiedadResumenItem[] = await res.json()
        aplicarItems(data)
        return
      }
      await cargarDesdePropiedadesBase()
    } catch {
      try {
        await cargarDesdePropiedadesBase()
      } catch {
        setItems([])
      }
    } finally {
      setLoading(false)
    }
  }, [aplicarItems, cargarDesdePropiedadesBase])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const propiedadLabel = (item: PropiedadResumenItem) =>
    item.titulo || `${item.direccion} · ${item.ciudad}`

  const handleGuardarOrden = async (id: string) => {
    const raw = ordenDraft[id]?.trim()
    const orden_display = raw === "" ? null : parseInt(raw, 10)

    if (raw !== "" && (isNaN(orden_display!) || orden_display! < 1)) {
      alert("El orden debe ser un número entero positivo")
      return
    }

    setGuardandoId(id)
    setGuardadoId(null)
    try {
      const res = await fetch(`/api/propietario/propiedades/${id}/orden`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden_display }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      setGuardadoId(id)
      setTimeout(() => setGuardadoId(null), 2000)
      await loadItems()
    } catch {
      alert("No se pudo guardar el orden")
    } finally {
      setGuardandoId(null)
    }
  }

  const handleDobleClick = (item: PropiedadResumenItem) => {
    setModalPropiedad(item)
    setModalOpen(true)
  }

  const handleContratos = (item: PropiedadResumenItem) => {
    if (item.contrato_activo_id) {
      router.push(`/propietario/contratos/${item.contrato_activo_id}`)
    } else {
      setSinContratoId(item.id)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando propiedades...</p>
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground">
        No se encontraron propiedades en tu cuenta. Si ya tienes propiedades creadas,{" "}
        <Link href="/propietario/propiedades" className="underline">
          revísalas en la sección Propiedades
        </Link>
        .
      </p>
    )
  }

  return (
    <>
      <p className="text-xs text-muted-foreground mb-3">
        Doble clic en una fila para ver el resumen financiero mensual.
      </p>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">Orden</TableHead>
              <TableHead className="min-w-[160px]">Propiedad</TableHead>
              <TableHead className="min-w-[140px]">Arrendatario principal</TableHead>
              <TableHead className="min-w-[140px]">Coarrendatario</TableHead>
              <TableHead className="min-w-[220px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onDoubleClick={() => handleDobleClick(item)}
              >
                <TableCell onDoubleClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-16"
                      value={ordenDraft[item.id] ?? ""}
                      onChange={(e) =>
                        setOrdenDraft((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={guardandoId === item.id}
                      onClick={() => handleGuardarOrden(item.id)}
                      title="Guardar orden"
                    >
                      {guardadoId === item.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.direccion}</p>
                    <p className="text-xs text-muted-foreground">{item.ciudad}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <ContactoCell contacto={item.arrendatario} />
                </TableCell>
                <TableCell>
                  <ContactoCell contacto={item.coarrendatario} />
                </TableCell>
                <TableCell onDoubleClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-1">
                    <Link href={`/propietario/propiedades/${item.id}/recibos`}>
                      <Button variant="outline" size="sm">
                        <Receipt className="mr-1 h-3.5 w-3.5" />
                        Recibos
                      </Button>
                    </Link>
                    <Link href={`/propietario/otros-gastos/propiedad/${item.id}`}>
                      <Button variant="outline" size="sm">
                        <DollarSign className="mr-1 h-3.5 w-3.5" />
                        Otros gastos
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContratos(item)}
                    >
                      <FileText className="mr-1 h-3.5 w-3.5" />
                      Contratos
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PropiedadResumenModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setModalPropiedad(null)
        }}
        propiedadId={modalPropiedad?.id ?? null}
        propiedadLabel={modalPropiedad ? propiedadLabel(modalPropiedad) : ""}
        aniosAtras={aniosAtras}
        vistaMensual={vistaMensual}
      />

      <AlertDialog open={!!sinContratoId} onOpenChange={() => setSinContratoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sin contrato activo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta propiedad no tiene un contrato activo. ¿Desea crear uno nuevo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sinContratoId) {
                  router.push(
                    `/propietario/contratos/nuevo?propiedad_id=${sinContratoId}`
                  )
                }
                setSinContratoId(null)
              }}
            >
              Crear contrato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
