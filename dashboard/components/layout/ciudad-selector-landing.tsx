"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function CiudadSelectorLanding() {
  const router = useRouter()
  const [ciudades, setCiudades] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/propiedades/ciudades")
      .then((res) => {
        if (!res.ok) {
          setCiudades([])
          return
        }
        return res.json()
      })
      .then((data: unknown) => {
        if (data === undefined) return
        setCiudades(Array.isArray(data) ? data : [])
      })
      .catch(() => setCiudades([]))
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    if (!value) {
      router.push("/catalogo")
    } else {
      router.push(`/catalogo?ciudad=${encodeURIComponent(value)}`)
    }
  }

  return (
    <div className="hidden md:block">
      <select
        className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition hover:border-gray-400"
        aria-label="Selector de ciudad"
        defaultValue=""
        onChange={handleChange}
      >
        <option value="">Seleccionar ciudad</option>
        {ciudades.map((ciudad) => (
          <option key={ciudad} value={ciudad}>
            {ciudad}
          </option>
        ))}
      </select>
    </div>
  )
}
