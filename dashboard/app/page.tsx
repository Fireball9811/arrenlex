"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
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

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-teal-200/80 bg-white/95 px-4 backdrop-blur-sm md:h-24 md:px-8">

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
            className="flex items-center gap-1 rounded-lg border border-teal-200 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:border-teal-400 hover:bg-teal-50 md:px-3 md:py-2"
          >
            <span className={lang === "es" ? "font-bold text-teal-900" : "text-teal-400"}>ES</span>
            <span className="text-teal-300">|</span>
            <span className={lang === "en" ? "font-bold text-teal-900" : "text-teal-400"}>EN</span>
          </button>

          {/* Botón Contáctenos */}
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-teal-700 md:px-4 md:py-2 md:text-sm"
          >
            <span className="hidden sm:inline">{c.boton}</span>
            <span className="sm:hidden">Contacto</span>
          </button>

          {/* Log In */}
          <Link
            href="/login"
            className="rounded-lg border border-teal-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700 transition hover:bg-teal-50 md:px-4 md:py-2 md:text-sm"
          >
            LOG IN
          </Link>
        </div>
      </header>

      {/* ── Hero con banner de fotos (botón Echar un vistazo arriba del banner) ── */}
      <LandingHero />

      {/* ── Hub ── */}
      <section className="px-6 py-12 text-center md:px-12 md:py-16">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-teal-600 md:text-base">
          {t.landing.hub}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 md:text-4xl lg:text-5xl">
          {t.landing.titulo}{" "}
          <span className="text-teal-600">{t.landing.futuro}</span>
        </h1>
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
