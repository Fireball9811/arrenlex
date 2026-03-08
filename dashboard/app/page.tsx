"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronRight, MessageCircle, Mail, Clock } from "lucide-react"
import { LandingHero } from "@/components/landing/landing-hero"
import { ContactModal } from "@/components/landing/contact-modal"
import { useLang } from "@/lib/i18n/context"

export default function HomePage() {
  const { t, lang, setLang } = useLang()
  const currentYear = new Date().getFullYear()
  const [modalOpen, setModalOpen] = useState(false)
  const c = t.landing.contacto

  return (
    <div className="min-h-screen bg-[#0f172a]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-white/10 bg-[#0f172a]/95 px-4 backdrop-blur-sm md:h-24 md:px-8">

        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/Logo.png"
            alt="Arrenlex · Gestión de Arriendos"
            width={280}
            height={96}
            priority
            className="h-14 w-auto object-contain md:h-20"
          />
        </Link>

        {/* Acciones */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Selector de idioma */}
          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white/60 transition hover:border-white/40 hover:text-white md:px-3 md:py-2"
          >
            <span className={lang === "es" ? "font-bold text-white" : "text-white/40"}>ES</span>
            <span className="text-white/20">|</span>
            <span className={lang === "en" ? "font-bold text-white" : "text-white/40"}>EN</span>
          </button>

          {/* Botón Contáctenos */}
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-cyan-600 md:px-4 md:py-2 md:text-sm"
          >
            <span className="hidden sm:inline">{c.boton}</span>
            <span className="sm:hidden">Contacto</span>
          </button>

          {/* Log In */}
          <Link
            href="/login"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 md:px-4 md:py-2 md:text-sm"
          >
            LOG IN
          </Link>
        </div>
      </header>

      {/* ── Hero con banner de fotos ── */}
      <LandingHero />

      {/* ── Hub + CTA ── */}
      <section className="px-6 py-16 text-center md:px-12 md:py-20">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400 md:text-base">
          {t.landing.hub}
        </p>
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
          {t.landing.titulo}{" "}
          <span className="text-cyan-400">{t.landing.futuro}</span>
        </h1>
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-8 py-4 text-base font-semibold uppercase tracking-wide text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-600 hover:shadow-cyan-500/30 md:text-lg"
        >
          {t.landing.botonCatalogo}
          <ChevronRight className="h-5 w-5" />
        </Link>
      </section>

      {/* ── Sección Contáctanos (info directa) ── */}
      <section className="border-t border-white/10 bg-[#070f1e] px-6 py-14 md:px-12">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">
            {c.sectionTitulo}
          </p>
          <h2 className="mb-2 text-center text-2xl font-bold text-white md:text-3xl">
            {c.sectionSubtitulo}
          </h2>
          <p className="mb-10 text-center text-sm text-gray-500">
            {c.horario}
          </p>

          <div className="grid gap-4 sm:grid-cols-3">

            {/* WhatsApp */}
            <a
              href="https://wa.me/573183863210"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center transition hover:border-cyan-500/40 hover:bg-cyan-500/10"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/15 transition group-hover:bg-cyan-500/25">
                <MessageCircle className="h-7 w-7 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  {c.whatsappLabel}
                </p>
                <p className="mt-1.5 text-base font-medium text-white">+57 318 386 3210</p>
              </div>
            </a>

            {/* Correo */}
            <a
              href="mailto:ceo@arrenlex.com"
              className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center transition hover:border-cyan-500/40 hover:bg-cyan-500/10"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/15 transition group-hover:bg-cyan-500/25">
                <Mail className="h-7 w-7 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  {c.correoLabel}
                </p>
                <p className="mt-1.5 text-base font-medium text-white">ceo@arrenlex.com</p>
              </div>
            </a>

            {/* Horario */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/15">
                <Clock className="h-7 w-7 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  {c.horarioLabel}
                </p>
                <p className="mt-1.5 text-sm font-medium text-white">{c.horario}</p>
              </div>
            </div>

          </div>

          {/* CTA formulario */}
          <div className="mt-10 text-center">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-500/50 px-8 py-3 text-sm font-semibold uppercase tracking-wide text-cyan-400 transition hover:bg-cyan-500 hover:text-white"
            >
              {c.boton}
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-[#040b14] px-6 py-8 text-center">
        <p className="text-xs text-gray-700">
          {t.landing.copyright} {currentYear}
        </p>
      </footer>

      {/* ── Modal de contacto ── */}
      <ContactModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
