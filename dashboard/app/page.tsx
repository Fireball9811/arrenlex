import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Marca de agua de fondo */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage: "url(/Logo.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "400px",
        }}
        aria-hidden
      />

      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200/80 bg-white/90 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-8">
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
          <div className="hidden md:block">
            <select
              className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition hover:border-gray-400"
              aria-label="Selector de ciudad"
            >
              <option value="">Seleccionar ciudad</option>
              <option value="bogota">Bogotá</option>
              <option value="medellin">Medellín</option>
              <option value="cali">Cali</option>
              <option value="barranquilla">Barranquilla</option>
            </select>
          </div>
        </div>

        <Link
          href="/login"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Sign In
        </Link>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-6 py-12">
        <section className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            Tu hogar ideal está aquí
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Encuentra y gestiona propiedades de arrendamiento en Colombia de forma sencilla y segura.
          </p>
        </section>

        {/* Placeholder zona fotos */}
        <section className="mb-16">
          <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50">
            <p className="text-gray-500">Área de fotos destacadas (próximamente)</p>
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-2 font-semibold text-card-foreground">Arrendar</h2>
            <p className="text-sm text-muted-foreground">
              Publica y encuentra propiedades disponibles para arrendamiento.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-2 font-semibold text-card-foreground">Gestionar</h2>
            <p className="text-sm text-muted-foreground">
              Administra contratos, pagos y documentación en un solo lugar.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-2 font-semibold text-card-foreground">Confiabilidad</h2>
            <p className="text-sm text-muted-foreground">
              Proceso transparente y seguro para arrendadores y arrendatarios.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
