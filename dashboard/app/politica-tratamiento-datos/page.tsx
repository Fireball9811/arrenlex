import Link from "next/link"

export const metadata = {
  title: "Política de Tratamiento de Datos Personales",
  description:
    "Política de tratamiento de datos personales de Arrenlex SAS (NIT 902036870-9), conforme a la Ley 1581 de 2012 y normativa aplicable en Colombia.",
}

export default function PoliticaTratamientoDatosPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Volver
        </Link>

        <h1 className="mb-3 text-3xl font-bold text-gray-900">
          Política de Tratamiento de Datos Personales
        </h1>
        <div className="mb-8 space-y-0.5 text-sm text-gray-600">
          <p className="font-medium text-gray-800">Arrenlex SAS</p>
          <p>Actualización: 2026.03</p>
          <p>Aplicable en Colombia</p>
        </div>

        <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm text-gray-700">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">1. Responsable del tratamiento</h2>
            <p className="mb-3">
              El responsable del tratamiento de los datos personales es Arrenlex SAS, identificada con NIT
              902036870-9, con domicilio en Colombia.
            </p>
            <p className="mb-3">
              Arrenlex SAS recolecta y trata datos personales a través del formulario de solicitud de
              arrendamiento, la plataforma, los enlaces enviados a los solicitantes y los canales habilitados
              para la gestión de solicitudes, inmuebles, contratos de arrendamiento y servicios relacionados.
            </p>
            <p className="mb-1 font-medium text-gray-900">Canal de atención para habeas data:</p>
            <p>
              <a
                href="mailto:habeasdata@arrenlex.com"
                className="font-medium text-cyan-700 underline hover:text-cyan-800"
              >
                habeasdata@arrenlex.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">2. Finalidad del tratamiento</h2>
            <p className="mb-3">Los datos personales serán tratados para las siguientes finalidades:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Evaluar solicitudes de arrendamiento.</li>
              <li>Verificar identidad.</li>
              <li>Validar la información suministrada por el titular.</li>
              <li>Analizar capacidad económica.</li>
              <li>Contactar referencias autorizadas por el titular.</li>
              <li>Gestionar comunicaciones relacionadas con el inmueble.</li>
              <li>Preparar documentos contractuales.</li>
              <li>Administrar la relación contractual de arrendamiento.</li>
              <li>Atender solicitudes, consultas, quejas o reclamos.</li>
              <li>Cumplir obligaciones legales, contractuales, administrativas o contables.</li>
              <li>Conservar soportes de la gestión realizada.</li>
              <li>
                Gestionar procesos relacionados con pagos, cartera, mantenimiento, entrega, devolución o
                administración del inmueble.
              </li>
              <li>Mejorar los servicios relacionados con la gestión inmobiliaria.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">3. Datos personales tratados</h2>
            <p className="mb-3">
              Arrenlex SAS tratará los datos personales que el titular suministre dentro del proceso de solicitud
              de arrendamiento o durante la gestión relacionada con el inmueble.
            </p>
            <p className="mb-2 font-medium text-gray-900">Estos datos incluyen:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Datos de identificación, como nombre, cédula y fecha o lugar de expedición.</li>
              <li>Datos de contacto, como teléfono, correo electrónico y dirección.</li>
              <li>Información laboral.</li>
              <li>Información económica.</li>
              <li>Información relacionada con ingresos.</li>
              <li>Información sobre personas que habitarán el inmueble.</li>
              <li>Información sobre mascotas.</li>
              <li>Información sobre vehículos, cuando aplique.</li>
              <li>Referencias personales, familiares, comerciales o laborales.</li>
              <li>
                Información entregada voluntariamente por el titular dentro del proceso de solicitud de
                arrendamiento.
              </li>
              <li>Información generada durante la gestión de la solicitud o de la relación contractual.</li>
            </ul>
            <p>
              Arrenlex SAS evitará recolectar datos que no sean necesarios para evaluar, gestionar o documentar la
              solicitud de arrendamiento.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">4. Autorización para el tratamiento</h2>
            <p className="mb-3">
              El titular autoriza de manera previa, expresa e informada a Arrenlex SAS para recolectar,
              almacenar, usar, consultar, actualizar, transmitir, conservar y validar sus datos personales, de
              acuerdo con las finalidades descritas en esta política.
            </p>
            <p className="mb-3">La autorización será solicitada antes del envío de la solicitud de arrendamiento.</p>
            <p className="mb-3">
              Si el titular no otorga autorización, la solicitud no será enviada ni gestionada.
            </p>
            <p className="mb-3">
              Arrenlex SAS conservará prueba de la autorización otorgada, incluyendo fecha, hora, versión de la
              política aceptada, texto aceptado y datos técnicos disponibles del envío.
            </p>
            <p className="mb-3">
              Cada arrendatario, coarrendatario o solicitante deberá diligenciar su propia solicitud y otorgar su
              propia autorización para el tratamiento de sus datos personales.
            </p>
            <p>
              Ningún solicitante deberá autorizar el tratamiento de datos personales en nombre de otra persona.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">5. Validación de información</h2>
            <p className="mb-3">
              Arrenlex SAS podrá apoyarse en proveedores, plataformas tecnológicas, operadores de validación o
              fuentes permitidas por la ley para validar la información suministrada por el titular.
            </p>
            <p className="mb-3">
              Esta validación se realizará únicamente para el estudio de la solicitud de arrendamiento, la gestión
              relacionada con el inmueble y el cumplimiento de obligaciones legales o contractuales.
            </p>
            <p>
              Arrenlex SAS no usará la información validada para finalidades ajenas al proceso de arrendamiento,
              salvo autorización expresa del titular o mandato legal aplicable.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">6. Datos de terceros</h2>
            <p className="mb-3">
              Cuando el titular suministre datos de referencias personales, familiares, comerciales, laborales o
              de contacto, declara que cuenta con autorización para entregar dicha información a Arrenlex SAS.
            </p>
            <p className="mb-3">
              Estos datos serán usados únicamente para validar la solicitud de arrendamiento o gestionar asuntos
              relacionados con el inmueble.
            </p>
            <p>
              Arrenlex SAS no usará los datos de terceros para publicidad, venta de bases de datos o finalidades
              ajenas a la solicitud de arrendamiento.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">7. Datos de menores de edad</h2>
            <p className="mb-3">
              Arrenlex SAS evitará recolectar datos identificables de menores de edad, salvo que sea necesario para
              fines contractuales, legales o administrativos relacionados con el inmueble.
            </p>
            <p className="mb-3">
              Cuando se traten datos de menores de edad, se respetarán sus derechos prevalentes, su interés
              superior y la normativa colombiana aplicable.
            </p>
            <p>
              En la etapa inicial de solicitud, Arrenlex SAS procurará recolectar información general, como
              cantidad de menores que habitarán el inmueble, sin solicitar datos identificables innecesarios.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">8. Derechos del titular</h2>
            <p className="mb-3">El titular tiene derecho a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Conocer, actualizar y rectificar sus datos personales.</li>
              <li>Solicitar prueba de la autorización otorgada.</li>
              <li>Ser informado sobre el uso dado a sus datos personales.</li>
              <li>
                Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la normativa
                de protección de datos personales.
              </li>
              <li>Revocar la autorización otorgada.</li>
              <li>
                Solicitar la supresión de sus datos personales cuando no exista un deber legal o contractual que
                impida su eliminación.
              </li>
              <li>Acceder de manera gratuita a sus datos personales tratados por Arrenlex SAS.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">9. Procedimiento para consultas y reclamos</h2>
            <p className="mb-3">Para ejercer sus derechos, el titular deberá enviar su solicitud al correo:</p>
            <p className="mb-3">
              <a
                href="mailto:habeasdata@arrenlex.com"
                className="font-medium text-cyan-700 underline hover:text-cyan-800"
              >
                habeasdata@arrenlex.com
              </a>
            </p>
            <p className="mb-2 font-medium text-gray-900">La solicitud deberá incluir:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Nombre completo.</li>
              <li>Número de identificación.</li>
              <li>Descripción clara de la petición.</li>
              <li>Medio de contacto para recibir respuesta.</li>
              <li>Documentos de soporte, si aplica.</li>
            </ul>
            <p className="mb-3">
              Las consultas serán atendidas dentro de los diez (10) días hábiles siguientes a la fecha de recibo.
            </p>
            <p className="mb-3">
              Si no fuere posible atender la consulta dentro de dicho término, Arrenlex SAS informará al titular los
              motivos de la demora y la fecha en que será atendida. En todo caso, la respuesta no superará los
              cinco (5) días hábiles siguientes al vencimiento del primer término.
            </p>
            <p className="mb-3">
              Los reclamos serán atendidos dentro de los quince (15) días hábiles siguientes a la fecha de recibo.
            </p>
            <p className="mb-3">
              Si no fuere posible atender el reclamo dentro de dicho término, Arrenlex SAS informará al titular los
              motivos de la demora y la fecha en que será atendido. En todo caso, la respuesta no superará los ocho
              (8) días hábiles siguientes al vencimiento del primer término.
            </p>
            <p className="mb-3">
              Si la solicitud se encuentra incompleta, Arrenlex SAS solicitará al titular la información necesaria
              para tramitarla.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">10. Seguridad de la información</h2>
            <p>
              Arrenlex SAS adoptará medidas técnicas, administrativas y organizativas para proteger los datos
              personales contra acceso no autorizado, pérdida, alteración, uso indebido, consulta no autorizada,
              divulgación no autorizada o destrucción.
            </p>
            <p className="mt-3">
              Estas medidas estarán orientadas a proteger la confidencialidad, integridad y disponibilidad de la
              información.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">11. Conservación de los datos</h2>
            <p className="mb-3">
              Los datos personales serán conservados durante el tiempo necesario para cumplir las finalidades
              autorizadas, gestionar la solicitud, administrar la relación contractual, atender reclamaciones y
              cumplir obligaciones legales, contractuales, administrativas o contables.
            </p>
            <p>
              Cuando los datos ya no sean necesarios para las finalidades autorizadas y no exista obligación legal
              o contractual de conservación, Arrenlex SAS procederá a su eliminación, anonimización o bloqueo,
              según corresponda.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">12. Proveedores y encargados</h2>
            <p className="mb-3">
              Arrenlex SAS podrá usar proveedores tecnológicos, servicios de alojamiento, almacenamiento, correo
              electrónico, mensajería, validación de información, soporte operativo y herramientas de gestión.
            </p>
            <p className="mb-3">
              Estos proveedores tratarán los datos personales bajo instrucciones de Arrenlex SAS y para las
              finalidades autorizadas por el titular.
            </p>
            <p>
              Cuando exista transmisión de datos personales a encargados del tratamiento, Arrenlex SAS procurará que
              dichos encargados apliquen medidas de seguridad y confidencialidad adecuadas.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">13. Transferencia o transmisión de datos</h2>
            <p className="mb-3">
              Arrenlex SAS podrá transmitir datos personales a proveedores o encargados ubicados en Colombia o en
              otros países, cuando ello sea necesario para la operación de la plataforma, la prestación de
              servicios tecnológicos, la validación de información, el almacenamiento, la comunicación con el titular
              o la gestión del proceso de arrendamiento.
            </p>
            <p>
              Dicha transmisión se realizará bajo las finalidades autorizadas por el titular y conforme a la
              normativa aplicable.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">14. Uso de la información</h2>
            <p className="mb-3">
              Arrenlex SAS no venderá, alquilará ni comercializará las bases de datos personales recolectadas.
            </p>
            <p>
              Los datos serán usados para las finalidades informadas al titular y autorizadas por este, salvo
              obligación legal, contractual o requerimiento de autoridad competente.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">15. Cambios en la política</h2>
            <p className="mb-3">
              Arrenlex SAS podrá actualizar esta política cuando existan cambios legales, operativos, tecnológicos
              o administrativos relacionados con el tratamiento de datos personales.
            </p>
            <p className="mb-3">
              Los cambios serán publicados en la plataforma o informados por los medios de contacto suministrados
              por el titular.
            </p>
            <p>
              Cuando el cambio implique una modificación sustancial en las finalidades del tratamiento, Arrenlex SAS
              solicitará una nueva autorización cuando corresponda.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">16. Vigencia</h2>
            <p className="mb-3">Esta política rige a partir de su publicación.</p>
            <p>
              La versión vigente de esta política corresponde a la actualización 2026.03.
            </p>
          </section>

          <div className="border-t border-gray-200 pt-6 text-sm text-gray-600">
            <p className="font-medium text-gray-900 mb-2">Referencia normativa:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Constitución Política de Colombia, artículo 15.</li>
              <li>Ley 1581 de 2012.</li>
              <li>Decreto 1377 de 2013.</li>
              <li>Normas y criterios aplicables de la Superintendencia de Industria y Comercio.</li>
            </ul>
          </div>
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
