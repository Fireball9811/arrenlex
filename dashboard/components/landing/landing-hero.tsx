"use client"

import { useEffect, useState } from "react"

const ROTATE_MS = 5000

type PropiedadPublica = {
  id: string
  imagen_principal: string | null
}

export function LandingHero() {
  const [imagenes, setImagenes] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/propiedades/public")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PropiedadPublica[]) => {
        const urls = (Array.isArray(data) ? data : [])
          .map((p) => p.imagen_principal)
          .filter((url): url is string => typeof url === "string" && url.length > 0)
        setImagenes(urls)
      })
      .catch(() => setImagenes([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (imagenes.length <= 1) return
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % imagenes.length)
    }, ROTATE_MS)
    return () => clearInterval(t)
  }, [imagenes.length])

  return (
    <section
      className="relative flex min-h-[70vh] flex-col justify-between px-6 pb-8 pt-12 md:min-h-[80vh] md:px-10"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0e7490 70%, #06b6d4 100%)",
      }}
    >
      {/* Marca de agua */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "url(/Logo.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "280px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <span className="whitespace-nowrap text-2xl font-semibold tracking-[0.4em] text-white md:text-3xl md:tracking-[0.6em]">
          ARRENLEX INMOBILIARIA
        </span>
      </div>

      {/* Centro: banner con fotos principales de propiedades */}
      <div className="relative z-10 flex flex-1 items-center justify-center py-8">
        <div className="relative h-[280px] w-full max-w-4xl overflow-hidden rounded-2xl bg-white/10 shadow-2xl md:h-[360px]">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center text-white/80">
              Cargando…
            </div>
          ) : imagenes.length > 0 ? (
            <>
              {imagenes.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                  style={{
                    opacity: i === index ? 1 : 0,
                    zIndex: i === index ? 1 : 0,
                  }}
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
              {/* Puntos indicadores */}
              {imagenes.length > 1 && (
                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                  {imagenes.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        i === index ? "bg-cyan-400" : "bg-white/40"
                      }`}
                      onClick={() => setIndex(i)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/80">
              Próximamente fotos destacadas
            </div>
          )}
        </div>
      </div>

      {/* Abajo izquierda: solo Exclusive Estate */}
      <div className="relative z-10 flex flex-col gap-2">
        <p className="text-lg font-semibold text-cyan-400 md:text-xl">Exclusive Estate</p>
      </div>
    </section>
  )
}
