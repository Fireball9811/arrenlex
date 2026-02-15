import Image from "next/image"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { LandingHero } from "@/components/landing/landing-hero"

export default function HomePage() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Header: logo + LOG IN */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200/80 bg-white/90 px-6 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/Logo.png"
            alt="Arrenlex Inmobiliaria"
            width={140}
            height={48}
            priority
            className="h-10 w-auto object-contain"
          />
        </Link>
        <Link
          href="/login"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium uppercase tracking-wide text-white transition hover:bg-gray-800"
        >
          LOG IN
        </Link>
      </header>

      {/* Hero: gradiente, marca de agua, banner central con fotos, Exclusive Estate */}
      <LandingHero />

      {/* Tarjeta CTA: blanco, bordes superiores redondeados; títulos y botón más arriba */}
      <section className="relative z-20 -mt-8 rounded-t-[2rem] bg-white px-6 pb-10 pt-6 shadow-lg md:-mt-12 md:rounded-t-[3rem] md:px-12 md:pt-8">
        <p className="mb-1 text-center text-sm font-medium uppercase tracking-[0.25em] text-cyan-600 md:text-base">
          El hub inmobiliario líder en Colombia
        </p>
        <h1 className="mb-4 text-center text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl">
          Encuentra tu próximo{" "}
          <span className="text-cyan-500">futuro</span>
        </h1>
        <div className="mb-8 flex justify-center">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-base font-medium uppercase tracking-wide text-white transition hover:bg-cyan-600 md:px-8 md:py-4 md:text-lg"
          >
            ECHAR UN VISTAZO
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
        <p className="text-center text-xs text-gray-500 md:text-sm">
          PROPIEDAD DE ARRENLEX INMOBILIARIA © {currentYear}
        </p>
      </section>
    </div>
  )
}
