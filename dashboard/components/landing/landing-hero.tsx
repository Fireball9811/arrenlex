"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

const ROTATE_MS = 15000

interface LandingHeroProps {
  onContact?: () => void
}

export function LandingHero({ onContact }: LandingHeroProps) {
  const { t, lang, setLang } = useLang()
  const [imagenes, setImagenes] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/propiedades/banner")
      .then((res) => res.ok ? res.json() : [])
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
      className="relative flex min-h-[75vh] flex-col justify-between px-6 pb-8 pt-0 md:min-h-[85vh] md:px-10"
      style={{
        background:
          "linear-gradient(135deg, #1e40af 0%, #0d9488 35%, #059669 65%, #0284c7 100%)",
      }}
    >
      {/* Marca de agua: mosaico de logos 4× más grande */}
      <div
        className="pointer-events-none select-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage: "url(/Logo.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "420px",
        }}
        aria-hidden
      />

      {/* ── Barra de navegación dentro del tapiz ── */}
      <div className="relative z-10 flex items-center justify-end pt-5 pb-2">
        {/* Botones: idioma, contacto, login */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* ES | EN */}
          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="flex items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 md:px-3 md:py-2"
          >
            <span className={lang === "es" ? "font-bold text-white" : "text-white/50"}>ES</span>
            <span className="text-white/30">|</span>
            <span className={lang === "en" ? "font-bold text-white" : "text-white/50"}>EN</span>
          </button>

          {/* Contáctenos */}
          <button
            onClick={onContact}
            className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-white/30 md:px-4 md:py-2 md:text-sm"
          >
            <span className="hidden sm:inline">{t.landing.contacto.boton}</span>
            <span className="sm:hidden">Contacto</span>
          </button>

          {/* LOG IN */}
          <Link
            href="/login"
            className="rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-white/25 md:px-4 md:py-2 md:text-sm"
          >
            LOG IN
          </Link>
        </div>
      </div>

      {/* Label central: ARRENLEX · GESTIÓN DE ARRIENDOS */}
      <div className="relative z-10 flex justify-center pt-4 pb-4">
        <span className="whitespace-nowrap text-xl font-semibold tracking-[0.35em] text-white md:text-3xl md:tracking-[0.55em] drop-shadow-sm">
          ARRENLEX · GESTIÓN DE ARRIENDOS
        </span>
      </div>

      {/* CTA: Echar un vistazo */}
      <div className="relative z-10 flex justify-center pb-6 pt-2">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 rounded-full bg-white/95 px-8 py-3.5 text-base font-semibold uppercase tracking-wide text-teal-700 shadow-xl transition hover:bg-white hover:shadow-2xl md:py-4 md:text-lg"
        >
          {t.landing.botonCatalogo}
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Banner con fotos */}
      <div className="relative z-10 flex flex-1 items-center justify-center py-6">
        <div className="relative h-[280px] w-full max-w-4xl overflow-hidden rounded-2xl bg-white/20 shadow-2xl ring-1 ring-white/20 md:h-[380px]">
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

              {imagenes.length > 1 && (
                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                  {imagenes.slice(0, 12).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Foto ${i + 1}`}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        i === index % 12 ? "bg-white" : "bg-white/50"
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

      {imagenes.length > 0 && (
        <div className="relative z-10">
          <p className="text-xs text-white/80">
            {index + 1} / {imagenes.length}
          </p>
        </div>
      )}
    </section>
  )
}
