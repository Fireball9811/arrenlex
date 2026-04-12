"use client"

import { useState } from "react"
import { MessageCircle, Mail, Clock } from "lucide-react"
import { LandingHero } from "@/components/landing/landing-hero"
import { ContactModal } from "@/components/landing/contact-modal"
import { useLang } from "@/lib/i18n/context"

export default function HomePage() {
  const { t, lang, setLang } = useLang()
  const currentYear = new Date().getFullYear()
  const [modalOpen, setModalOpen] = useState(false)
  const c = t.landing.contacto

  return (
    <div className="min-h-screen bg-teal-50">

      {/* ── Hero: sin header separado, todo va en el tapiz ── */}
      <LandingHero onContact={() => setModalOpen(true)} />

      {/* ── Hub con tapiz de marca de agua ── */}
      <section
        className="relative overflow-hidden px-6 py-16 text-center md:px-12 md:py-24"
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #0d9488 35%, #059669 65%, #0284c7 100%)",
        }}
      >
        {/* Mosaico de logos como marca de agua */}
        <div
          className="pointer-events-none select-none absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: "url(/Logo2.png)",
            backgroundRepeat: "repeat",
            backgroundSize: "420px",
          }}
          aria-hidden
        />
        {/* Contenido centrado sobre el tapiz */}
        <div className="relative z-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-teal-200 md:text-base">
            {t.landing.hub}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md md:text-4xl lg:text-5xl">
            {t.landing.titulo}{" "}
            <span className="text-teal-300">{t.landing.futuro}</span>
          </h1>
        </div>
      </section>

      {/* ── Sección Contáctanos (info directa) ── */}
      <section className="border-t border-teal-200/80 bg-white px-6 py-14 md:px-12">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
            {c.sectionTitulo}
          </p>
          <h2 className="mb-10 text-center text-2xl font-bold text-slate-800 md:text-3xl">
            {c.sectionSubtitulo}
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">

            {/* WhatsApp */}
            <a
              href="https://wa.me/573114433413"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 px-6 py-8 text-center transition hover:border-teal-400 hover:bg-teal-100"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 transition group-hover:bg-teal-200">
                <MessageCircle className="h-7 w-7 text-teal-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
                  {c.whatsappLabel}
                </p>
                <p className="mt-1.5 text-base font-medium text-slate-800">+57 311 443 3413</p>
              </div>
            </a>

            {/* Correo */}
            <a
              href="mailto:ceo@arrenlex.com"
              className="group flex flex-col items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 px-6 py-8 text-center transition hover:border-teal-400 hover:bg-teal-100"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 transition group-hover:bg-teal-200">
                <Mail className="h-7 w-7 text-teal-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
                  {c.correoLabel}
                </p>
                <p className="mt-1.5 text-base font-medium text-slate-800">ceo@arrenlex.com</p>
              </div>
            </a>

            {/* Horario */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 px-6 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
                <Clock className="h-7 w-7 text-teal-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
                  {c.horarioLabel}
                </p>
                <p className="mt-1.5 text-sm font-medium text-slate-800">{c.horario}</p>
              </div>
            </div>

          </div>

          {/* CTA formulario */}
          <div className="mt-10 text-center">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border-2 border-teal-500 px-8 py-3 text-sm font-semibold uppercase tracking-wide text-teal-700 transition hover:bg-teal-500 hover:text-white"
            >
              {c.boton}
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-teal-200/60 bg-teal-50 px-6 py-8 text-center">
        <p className="text-xs text-slate-600">
          {t.landing.copyright} {currentYear}
        </p>
      </footer>

      {/* ── Modal de contacto ── */}
      <ContactModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
