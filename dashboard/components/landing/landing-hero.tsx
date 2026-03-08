"use client"

import { useEffect, useState } from "react"
import { useLang } from "@/lib/i18n/context"

const ROTATE_MS = 4500

export function LandingHero() {
  const { t } = useLang()
  const [imagenes, setImagenes] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/propiedades/banner")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        const urls = Array.isArray(data)
          ? data.filter((u): u is string => typeof u === "string" && u.length > 0)
          : []
        setImagenes(urls)
      })
      .catch(() => setImagenes([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (imagenes.length <= 1) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % imagenes.length)
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [imagenes.length])

  return (
    <section
      className="relative flex min-h-[70vh] flex-col justify-between px-6 pb-8 pt-10 md:min-h-[80vh] md:px-10"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0e7490 70%, #06b6d4 100%)",
      }}
    >
      {/* Marca de agua */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "url(/Logo.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "260px",
        }}
        aria-hidden
      />

      {/* Texto central superpuesto */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <span className="whitespace-nowrap text-xl font-semibold tracking-[0.35em] text-white/90 md:text-3xl md:tracking-[0.55em]">
          ARRENLEX · GESTIÓN DE ARRIENDOS
        </span>
      </div>

      {/* Banner con fotos */}
      <div className="relative z-10 flex flex-1 items-center justify-center py-8">
        <div className="relative h-[280px] w-full max-w-4xl overflow-hidden rounded-2xl bg-white/10 shadow-2xl md:h-[380px]">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center text-white/70 text-sm">
              {t.landing.cargandoFotos}
            </div>
          ) : imagenes.length > 0 ? (
            <>
              {imagenes.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
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
                  {imagenes.slice(0, 12).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Foto ${i + 1}`}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        i === index % 12 ? "bg-cyan-400" : "bg-white/30"
                      }`}
                      onClick={() => setIndex(i)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/70 text-sm">
              {t.landing.proximamenteFotos}
            </div>
          )}
        </div>
      </div>

      {/* Contador de fotos */}
      {imagenes.length > 0 && (
        <div className="relative z-10">
          <p className="text-xs text-white/40">
            {index + 1} / {imagenes.length}
          </p>
        </div>
      )}
    </section>
  )
}
