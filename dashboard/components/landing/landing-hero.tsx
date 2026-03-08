"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useLang } from "@/lib/i18n/context"

const ROTATE_MS = 15000

export function LandingHero() {
  const { t } = useLang()
  const [imagenes, setImagenes] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const DEBUG_LOG = (msg: string, data: Record<string, unknown>) => {
      fetch('http://127.0.0.1:7242/ingest/6e4d7e72-632e-40c7-9284-d25bbdae67c2', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b8dc72' }, body: JSON.stringify({ sessionId: 'b8dc72', location: 'landing-hero.tsx', message: msg, data, timestamp: Date.now(), hypothesisId: 'H4-H5' }) }).catch(() => {});
    };
    fetch("/api/propiedades/banner")
      .then((res) => {
        // #region agent log
        DEBUG_LOG('banner fetch response', { ok: res.ok, status: res.status });
        console.log('[DEBUG-banner] fetch response:', res.ok, res.status);
        // #endregion
        return res.ok ? res.json() : []
      })
      .then((data: unknown) => {
        const urls = Array.isArray(data)
          ? data.filter((u): u is string => typeof u === "string" && u.length > 0)
          : []
        // #region agent log
        DEBUG_LOG('banner data processed', { isArray: Array.isArray(data), dataLength: Array.isArray(data) ? data.length : 0, urlCount: urls.length });
        console.log('[DEBUG-banner] data processed:', { isArray: Array.isArray(data), dataLength: Array.isArray(data) ? data.length : 0, urlCount: urls.length });
        // #endregion
        setImagenes(urls)
      })
      .catch((err) => {
        // #region agent log
        DEBUG_LOG('banner fetch catch', { error: String(err) });
        console.log('[DEBUG-banner] fetch catch:', err);
        // #endregion
        setImagenes([])
      })
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
          "linear-gradient(135deg, #1e40af 0%, #0d9488 35%, #059669 65%, #0284c7 100%)",
      }}
    >
      {/* Marca de agua */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "url(/Logo.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "260px",
        }}
        aria-hidden
      />

      {/* Label arriba: ARRENLEX · GESTIÓN DE ARRIENDOS */}
      <div className="relative z-10 flex justify-center pt-2 pb-4">
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
      <div className="relative z-10 flex flex-1 items-center justify-center py-8">
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

              {/* Puntos indicadores */}
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

      {/* Contador de fotos */}
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
