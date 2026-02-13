import Link from "next/link"

export const metadata = {
  title: "Política de tratamiento de datos personales | Arrenlex",
  description: "Política de tratamiento de datos personales de Arrenlex Inmobiliaria, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Colombia).",
}

export default function PoliticaDatosPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Volver
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Política de tratamiento de datos personales
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Arrenlex Inmobiliaria — Actualización: 2025. Aplicable en Colombia.
        </p>

        <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">1. Responsable del tratamiento</h2>
            <p className="text-gray-700">
              El responsable del tratamiento de los datos personales es <strong>Arrenlex Inmobiliaria</strong>,
              quien los recoge a través del formulario de registro de arrendatarios y de la plataforma,
              para la gestión de arrendamientos y servicios relacionados.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">2. Finalidad del tratamiento</h2>
            <p className="text-gray-700">
              Sus datos personales serán utilizados para: (i) gestionar la relación contractual de arrendamiento;
              (ii) verificar identidad y capacidad de pago; (iii) comunicarnos con usted en relación con el inmueble
              y el contrato; (iv) cumplir obligaciones legales y contractuales; (v) mejorar nuestros servicios.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">3. Datos que tratamos</h2>
            <p className="text-gray-700">
              Tratamos datos de identificación (nombre, cédula, teléfono), datos de contacto, información
              laboral y económica que usted nos proporcione, datos sobre personas que habitarán el inmueble,
              mascotas, vehículos y referencias personales y familiares, en la medida en que nos los suministre
              y nos haya autorizado su tratamiento.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">4. Autorización</h2>
            <p className="text-gray-700">
              De conformidad con la Ley 1581 de 2012 y el Decreto 1377 de 2013, el titular de los datos
              debe autorizar de manera previa, expresa e informada el tratamiento de sus datos personales.
              Al marcar la casilla de autorización en el formulario, usted consiente el tratamiento de sus
              datos conforme a esta política.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">5. Derechos del titular</h2>
            <p className="text-gray-700">
              Usted tiene derecho a: (i) conocer, actualizar y rectificar sus datos; (ii) solicitar prueba
              de la autorización otorgada; (iii) ser informado sobre el uso de sus datos; (iv) presentar
              quejas ante la Superintendencia de Industria y Comercio (SIC) por infracción a la normativa;
              (v) revocar la autorización y/o solicitar la supresión de sus datos cuando no exista un
              deber legal que impida su eliminación. Para ejercer estos derechos puede contactarnos a través
              de los canales indicados en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">6. Seguridad y conservación</h2>
            <p className="text-gray-700">
              Adoptamos medidas técnicas y organizativas para proteger sus datos contra acceso no autorizado,
              pérdida o alteración. Los datos se conservarán durante el tiempo necesario para cumplir las
              finalidades del tratamiento y las obligaciones legales aplicables.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">7. Vigencia</h2>
            <p className="text-gray-700">
              Esta política rige a partir de su publicación. Cualquier cambio será notificado a través de
              la plataforma o por los medios de contacto que nos haya proporcionado.
            </p>
          </section>

          <p className="border-t border-gray-200 pt-6 text-sm text-gray-500">
            Referencia normativa: Ley 1581 de 2012 (protección de datos personales), Decreto 1377 de 2013
            (reglamentación parcial), Constitución Política de Colombia (art. 15).
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
