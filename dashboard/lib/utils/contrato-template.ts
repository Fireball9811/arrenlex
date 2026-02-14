import { DatosContrato } from "@/lib/types/database"

/**
 * Plantilla del contrato de arrendamiento con marcadores de posicion
 * que seran reemplazados por los datos reales.
 */

export const CONTRATO_PLANTILLA = `CONTRATO DE ARRENDAMIENTO DE INMUEBLE DESTINADO A VIVIENDA URBANA

Entre los suscritos a saber {{ARRENDADOR_NOMBRE}}, mayor de edad, identificado(a) con cedula de ciudadania No. {{ARRENDADOR_CEDULA}} de {{ARRENDADOR_CEDULA_EXPEDICION}}, residenciado(a) y domiciliado(a) en {{ARRENDADOR_DIRECCION}}, quien en adelante se denominara EL ARRENDADOR(A), por una parte; y por la otra; {{ARRENDATARIO_NOMBRE}}, mayor de edad, identificado(a) con cedula de ciudadania No. {{ARRENDATARIO_CEDULA}} de {{ARRENDATARIO_CEDULA_EXPEDICION}}, residenciado(a) y domiciliado(a) en {{ARRENDATARIO_DIRECCION}} quien en adelante se denominara EL ARRENDATARIO(A). Hemos convenido en celebrar el presente Contrato de Arrendamiento de Inmueble destinado a Vivienda Urbana, que se regira en los terminos y condiciones que a continuacion se expresan:

CLAUSULA I. – OBJETO Y DESTINACION.
EL ARRENDADOR da en arrendamiento a EL ARRENDATARIO el inmueble destinado a vivienda urbana, ubicado en la direccion: {{PROPIEDAD_DIRECCION}}, con matricula inmobiliaria No {{PROPIEDAD_MATRICULA}}. Especificandose que queda prohibido utilizar el inmueble para fines comerciales, industriales o distintos a los de vivienda familiar.

CLAUSULA II. – ENTREGA.
EL ARRENDATARIO declara que recibe el inmueble objeto del presente contrato en excelentes condiciones de uso, conservacion, funcionamiento y habitabilidad, a su entera satisfaccion, conforme al acta de inventario que se suscribe y que hace parte integral e inseparable del presente contrato, la cual manifiesta conocer, aceptar y firmar.

CLAUSULA III. – CANON DE ARRENDAMIENTO.
EL ARRENDATARIO podra pagar a EL ARRENDADOR mediante consignacion en la cuenta de la siguiente descripcion:

ENTIDAD BANCARIA: {{PROPIEDAD_CUENTA_ENTIDAD}}
TIPO DE CUENTA: {{PROPIEDAD_CUENTA_TIPO}}
No. DE CUENTA: {{PROPIEDAD_CUENTA_NUMERO}}
TITULAR DE LA CUENTA: {{PROPIEDAD_CUENTA_TITULAR}}

El canon mensual de arrendamiento se fija en {{CONTRATO_CANON_COP}} COP, que debera ser cancelado dentro de los cinco (5) primeros dias calendario de cada mes.

PARAGRAFO: La mera tolerancia de EL ARRENDADOR en aceptar el pago del precio con posterioridad a los cinco (5) dias citados no se entendera como animo de modificar esta clausula.

CLAUSULA IV. – MORA.
En caso de mora en el pago del canon de arrendamiento a cargo de EL ARRENDATARIO derivadas del presente contrato, este reconocera y pagara a favor de EL ARRENDADOR intereses moratorios equivalentes al interes bancario corriente, liquidados sobre las sumas insolutas, sin perjuicio de las acciones legales a que haya lugar para la exigibilidad del cumplimiento del contrato, la terminacion de este y la indemnizacion de perjuicios.

PARAGRAFO PRIMERO: Cuando el pago del canon o de cualquier otra obligacion se realice mediante cheque y este fuere devuelto o resultare impagado por cualquier causa imputable a EL ARRENDATARIO, este debera pagar a favor de EL ARRENDADOR una sancion equivalente al veinte por ciento (20%) del valor del cheque, conforme a lo dispuesto en el articulo 731 del Codigo de Comercio, sin perjuicio del cobro del valor principal adeudado.

PARAGRAFO SEGUNDO: EL ARRENDATARIO se obliga al pago oportuno e integro del canon de arrendamiento y de las demas obligaciones economicas derivadas del presente contrato. Para garantizar dicho cumplimiento y las indemnizaciones a que haya lugar, EL ARRENDADOR queda facultado para retener los bienes muebles introducidos por EL ARRENDATARIO para su amueblamiento, guarnicion o uso, siempre que le pertenezcan, presumiendose su propiedad mientras no se demuestre lo contrario, en los terminos previstos en el articulo 2000 del Codigo Civil.

CLAUSULA V. – REAJUSTE AL CANON DE ARRENDAMIENTO.
En caso de prorroga de este contrato, el canon de arrendamiento se reajustara anualmente conforme a la variacion del Indice de Precios al Consumidor (IPC) certificado por el DANE del ano calendario anterior, para lo cual se emitira comunicado con un mes de antelacion al termino del contrato estableciendo el aumento de acuerdo con lo senalado en el articulo 20 de la Ley 820 de 2003.

CLAUSULA VI. PAGO DE SERVICIOS PUBLICOS.
EL ARRENDATARIO se obliga a asumir integra, oportuna y exclusivamente el pago de todos los servicios publicos domiciliarios que se causen por el uso y goce del inmueble durante la vigencia del presente contrato, incluyendo, sin limitarse a ellos, energia electrica, acueducto, alcantarillado, aseo, gas domiciliario, telecomunicaciones, television por suscripcion e internet, asi como cualquier otro servicio que se instale o utilice en el inmueble. EL ARRENDATARIO debera realizar los pagos dentro de los plazos establecidos por las respectivas empresas prestadoras, manteniendo los servicios permanentemente al dia, y se compromete a entregar el inmueble, al momento de la restitucion, paz y salvo por todo concepto frente a dichas entidades. El no pago oportuno, la suspension, corte, reconexion, reinstalacion o cualquier cargo adicional generado por mora o incumplimiento sera de exclusiva responsabilidad de EL ARRENDATARIO, quien debera asumir los costos, intereses, sanciones y gastos que se ocasionen. EL ARRENDADOR podra verificar directamente ante las empresas prestadoras el estado de cuenta de los servicios publicos, asi como para exigir los comprobantes de pago a EL ARRENDATARIO cuando lo estime necesario.

PARAGRAFO: EL ARRENDATARIO se abstendra de celebrar por iniciativa propia convenios, acuerdos, creditos o seguros con entidades financieras, aseguradoras o companias de credito, que tengan por objeto obligaciones relacionadas directa o indirectamente con el inmueble arrendado. Cualquier acuerdo celebrado en contravencion de lo aqui dispuesto sera de exclusiva responsabilidad de EL ARRENDATARIO, quien asumira integramente las consecuencias economicas, contractuales y legales que de ello se deriven, manteniendo indemne a EL ARRENDADOR.

CLAUSULA VII. – TERMINO DE DURACION.
El termino de duracion de este contrato es de {{CONTRATO_DURACION_MESES}} ({{CONTRATO_DURACION_MESES_EN_LETRAS}}) meses, contados a partir del {{CONTRATO_FECHA_INICIO_DIA}} de {{CONTRATO_FECHA_INICIO_MES}} del ano {{CONTRATO_FECHA_INICIO_ANIO}}.

CLAUSULA VIII. – PRORROGA DEL CONTRATO.
El presente contrato se prorrogara automaticamente en las mismas condiciones, a excepcion del aumento anual aplicado al canon de arrendamiento y por un termino igual al inicialmente pactado.

CLAUSULA IX. – TERMINACION POR MUTUO ACUERDO.
El presente contrato podra darse por terminado en cualquier momento, por mutuo acuerdo entre EL ARRENDADOR y EL ARRENDATARIO, siempre que dicho acuerdo conste por escrito, mediante documento suscrito por ambas partes, en el cual se determine de manera expresa la fecha de terminacion, las condiciones de entrega del inmueble y el estado de las obligaciones economicas. La terminacion por mutuo acuerdo no exime a las partes del cumplimiento de las obligaciones causadas con anterioridad, de tal forma que EL ARRENDATARIO se compromete a entregar el inmueble en las mismas condiciones en que lo recibio conforme al acta de inventario, y el total de las facturas de servicios publicos debidamente cancelados. Una vez cumplidas las condiciones acordadas y realizada la entrega material del inmueble, las partes se declararan a paz y salvo por todo concepto.

CLAUSULA X. – TERMINACION UNILATERAL.
Cualquiera de las partes podra dar por terminado unilateralmente el presente contrato, al vencimiento del termino inicial o de cualquiera de sus prorrogas, siempre que medie aviso previo, expreso y por escrito, enviado a la otra parte con una antelacion no inferior a tres (3) meses, en los terminos y condiciones previstos en la Ley 820 de 2003. Cuando la terminacion unilateral sea ejercida por EL ARRENDADOR, esta debera fundarse en alguna de las causales de la Ley 820 de 2003, asi como las establecidas en el presente contrato y cumplira con los requisitos de forma, oportunidad y, cuando sea aplicable, pago de la indemnizacion legal correspondiente. Cuando la terminacion unilateral sea ejercida por EL ARRENDATARIO, esta debera fundarse en alguna de las causales de la Ley 820 de 2003, asi como cumplir igualmente con el preaviso legal y, de ser procedente, con el pago de la indemnizacion establecida por la ley.

PARAGRAFO: De no mediar constancia por escrito del preaviso, el contrato de arrendamiento se entendera renovado automaticamente por un termino igual al inicialmente pactado.

CLAUSULA XI. – CAUSALES DE TERMINACION.
El presente contrato podra darse por terminado, ademas de las previstas por la ley, por la ocurrencia de cualquiera de las siguientes causales:

1. Mutuo acuerdo entre las partes, debidamente formalizado por escrito.
2. Incumplimiento grave de las obligaciones contractuales o legales por cualquiera de las partes.
3. Mora en el pago del canon de arrendamiento, de los servicios publicos o de cualquier otra suma a cargo de EL ARRENDATARIO.
4. Uso indebido del inmueble, destinacion diferente a vivienda urbana o realizacion de actividades prohibidas por la ley.
5. Subarriendo, cesion o transferencia del contrato sin autorizacion previa y escrita de EL ARRENDADOR.
6. Deterioro grave del inmueble imputable a EL ARRENDATARIO o a las personas que de el dependan.
7. La realizacion de mejoras, cambios o ampliaciones del inmueble, sin expresa autorizacion del arrendador.
8. Celebracion de acuerdos no autorizados con empresas de servicios publicos o entidades financieras que afecten el inmueble o al ARRENDADOR.
9. Requerimiento legal del inmueble por parte de EL ARRENDADOR para su propio uso, reconstruccion, demolicion o venta, en los terminos previstos en la Ley 820 de 2003.
10. Fuerza mayor o caso fortuito que imposibilite de manera definitiva el uso del inmueble.
11. Cualquier otra causal legal prevista en la Ley 820 de 2003 y normas concordantes.

La ocurrencia de cualquiera de estas causales dara lugar a la terminacion del contrato y a la restitucion del inmueble, sin perjuicio del cobro de las sumas adeudadas, intereses, indemnizaciones y demas acciones legales a que haya lugar.

CLAUSULA XII. – MEJORAS.
EL ARRENDATARIO se abstendra de realizar en el inmueble cualquier tipo de mejora, adecuacion, reparacion util o necesaria, obra, modificacion, intervencion o alteracion de su estructura, distribucion, fachadas, instalaciones o arquitectura, sin la autorizacion previa, expresa y escrita de EL ARRENDADOR. Salvo pacto escrito en contrario, ninguna mejora realizada por EL ARRENDATARIO dara lugar a reembolso, compensacion o reconocimiento economico por parte de EL ARRENDADOR, y aquellas queden incorporadas al inmueble se entenderan realizadas en beneficio de este, sin derecho a indemnizacion.

CLAUSULA XIII. – REPARACIONES LOCATIVAS.
EL ARRENDATARIO sera responsable de ejecutar y asumir, a su costa, las reparaciones locativas, entendidas como aquellas que se originan en el uso ordinario y normal del inmueble, de conformidad con lo dispuesto en los articulos 2028, 2029 y 2030 del Codigo Civil.

CLAUSULA XIV. – INSPECCION, VIGILANCIA Y VERIFICACION DEL ESTADO DEL INMUEBLE.
EL ARRENDATARIO permitira el acceso al inmueble a EL ARRENDADOR o a las personas que este designe, con el fin de verificar el estado de conservacion, uso, mantenimiento y cumplimiento de las obligaciones contractuales, asi como para realizar inspecciones tecnicas, reparaciones necesarias, avaluos o gestiones relacionadas con la administracion del inmueble.

CLAUSULA XV. – AUTORIZACION PARA EXHIBICION.
EL ARRENDADOR podra autorizar por escrito para que el inmueble pueda ser visitado y exhibido a terceros con fines de promocion, negociacion o eventual compraventa, y EL ARRENDATARIO se compromete a permitir el acceso.

PARAGRAFO: En caso de que el inmueble sea vendido, EL ARRENDATARIO se obliga a restituirlo totalmente desocupado, sin que haya lugar a compensacion o indemnizacion alguna, siempre que EL ARRENDADOR haya notificado dicha circunstancia con una antelacion minima de tres (3) meses, conforme a la Ley 820 de 2003, y sin perjuicio del cumplimiento integro de las obligaciones economicas causadas hasta la fecha efectiva de entrega.

CLAUSULA XVI. – PROHIBICION DE SUBARRIENDO, CESION Y OCUPACION POR TERCEROS.
EL ARRENDATARIO no podra, en ningun caso y bajo ninguna modalidad, subarrendar, ceder total o parcialmente el contrato, transferir la tenencia, ni permitir la ocupacion, habitacion o uso del inmueble por terceros, sea a titulo gratuito u oneroso, sin la autorizacion previa, expresa y escrita de EL ARRENDADOR. La infraccion de esta prohibicion constitura incumplimiento grave del contrato y facultara a EL ARRENDADOR para dar por terminado unilateralmente el contrato, exigir la restitucion inmediata del inmueble, e iniciar las acciones judiciales correspondientes, sin perjuicio del cobro de los canones adeudados, la clausula penal, los perjuicios causados y las demas sanciones legales a que haya lugar.

CLAUSULA XVII. – OCUPACION INDEBIDA DEL INMUEBLE.
La permanencia de EL ARRENDATARIO en el inmueble arrendado sin el pago oportuno del canon de arrendamiento, sus reajustes, intereses o conceptos a su cargo, asi como la falta de comunicacion, localizacion o respuesta frente a los requerimientos realizados por EL ARRENDADOR, constituira incumplimiento grave del contrato y dara lugar a la terminacion unilateral del mismo, de conformidad con lo dispuesto la Ley 820 de 2003. En consecuencia, EL ARRENDADOR quedara plenamente facultado para iniciar de manera inmediata el proceso de restitucion del bien inmueble arrendado, sin necesidad de requerimiento previo distinto al exigido por la ley, asi como para exigir el pago de los canones adeudados, intereses moratorios, clausula penal, indemnizaciones a que haya lugar y demas perjuicios derivados de la ocupacion indebida del inmueble. La ocupacion del inmueble sin pago del canon de arrendamiento no genera derecho alguno de permanencia, ni podra entenderse como tolerancia, novacion o prorroga del contrato por parte de EL ARRENDADOR, quien conserva integramente sus derechos legales y contractuales.

CLAUSULA XVIII. – ABANDONO DEL INMUEBLE.
EL ARRENDATARIO autoriza expresa e irrevocablemente a EL ARRENDADOR para que, en los eventos en que el inmueble se encuentre manifiestamente abandonado o deshabitado, y existan indicios objetivos de riesgo (tales como deterioro grave, desmantelamiento, afectacion estructural, riesgo para inmuebles vecinos o para la seguridad de personas) pueda ingresar al inmueble con fines exclusivos de verificacion, proteccion y conservacion con el solo requisito de la presencia de dos testigos, dejando constancia escrita mediante acta detallada del estado del inmueble.

PARAGRAFO: Las actuaciones realizadas en virtud de esta clausula tendrán como unico proposito evitar danos, perdidas o agravacion del deterioro, y no exoneran a EL ARRENDATARIO de las responsabilidades economicas, contractuales y legales a que haya lugar.

CLAUSULA XIX. – RESTITUCION DEL INMUEBLE.
EL ARRENDATARIO se obliga a restituir el inmueble en el mismo estado satisfactorio de conservacion, uso y funcionamiento en que lo recibio, conforme a lo consignado en el acta de inventario que hace parte integral del presente contrato. La restitucion debera efectuarse con todas las instalaciones, redes y servicios de cualquier naturaleza en correcto funcionamiento, incluyendo cerraduras, chapas y demas elementos de seguridad, los cuales deberan entregarse en buen estado y con la totalidad de sus llaves. Asi mismo, el inmueble debera ser entregado recien pintado en el color originalmente recibido, con puertas, closets y demas elementos incorporados en adecuado estado, salvo el deterioro normal derivado del uso legitimo.

CLAUSULA XX. – CLAUSULA PENAL POR INCUMPLIMIENTO CONTRACTUAL.
El incumplimiento total o parcial de cualquiera de las obligaciones a cargo de EL ARRENDATARIO derivadas del presente contrato dara lugar, sin necesidad de requerimiento previo, al pago a favor de EL ARRENDADOR de una clausula penal equivalente a tres (3) canones mensuales de arrendamiento.

CLAUSULA XXI. – MERITO EJECUTIVO Y EXIGIBILIDAD.
El presente contrato constituye por si mismo un titulo que presta merito ejecutivo, de conformidad con lo dispuesto en el Codigo Civil, Codigo General del Proceso, Codigo de Comercio, y demas normas reglamentarias o complementarias, en cuanto contiene obligaciones claras, expresas y exigibles. EL ARRENDADOR podra cobrar ejecutivamente el valor de los canones de arrendamiento adeudados, los intereses de mora, la clausula penal pactada en este contrato, los servicios publicos dejados de pagar, los gastos de cobranza judicial en los cuales EL ARRENDADOR por su cuenta o por medio de terceros deba incurrir en procura del pago del saldo adeudado; bastando la sola afirmacion y la presentacion de este contrato.

PARAGRAFO: Toda controversia o diferencia relativa a este contrato, su ejecucion y liquidacion se resolvera por medio de la jurisdiccion ordinaria de Colombia.

CLAUSULA XXII. – DEUDOR SOLIDARIO.
Comparece al presente contrato el senor(a) {{DEUDOR_SOLIDARIO_NOMBRE}}, mayor de edad, identificado(a) con la cedula de ciudadania No. {{DEUDOR_SOLIDARIO_CEDULA}}, quien actua en su propio nombre y se constituye expresa, voluntaria e irrevocablemente como DEUDOR SOLIDARIO de todas y cada una de las obligaciones asumidas por EL ARRENDATARIO en virtud del presente contrato de arrendamiento. En tal condicion, el DEUDOR SOLIDARIO se obliga solidariamente, en los terminos de los articulos 1568 y siguientes del Codigo Civil, al cumplimiento integro, oportuno y total de las obligaciones derivadas del presente contrato, incluyendo, sin limitarse a ello, el pago de canones de arrendamiento, servicios publicos, expensas, intereses, sanciones, clausula penal, indemnizaciones, costas y agencias en derecho, asi como a la restitucion del inmueble y a los perjuicios que se causen por el incumplimiento total o parcial del contrato. El DEUDOR SOLIDARIO renuncia de manera expresa a los beneficios de excusion, division y orden, y acepta que EL ARRENDADOR pueda exigirle el cumplimiento de las obligaciones garantizadas de forma directa, inmediata y sin necesidad de requerimiento previo ni de agotar gestion alguna contra EL ARRENDATARIO. Asi mismo, el DEUDOR SOLIDARIO declara conocer integramente el contenido del presente contrato, acepta sus terminos y condiciones, y reconoce que su obligacion tiene caracter principal, autonomo y no accesorio.

CLAUSULA XXIII. – NOTIFICACIONES.
EL ARRENDATARIO recibira notificaciones en la direccion {{ARRENDATARIO_DIRECCION}}, correo electronico {{ARRENDATARIO_EMAIL}} y celular {{ARRENDATARIO_CELULAR}}.
EL ARRENDADOR recibira notificaciones en el correo electronico {{ARRENDADOR_EMAIL}} y celular {{ARRENDADOR_CELULAR}}.
EL DEUDOR SOLIDARIO recibira notificaciones en la direccion {{DEUDOR_SOLIDARIO_DIRECCION}}, en el correo electronico {{DEUDOR_SOLIDARIO_EMAIL}} y celular {{DEUDOR_SOLIDARIO_CELULAR}}.

En constancia de lo anterior, se firma el presente contrato en tres (3) ejemplares del mismo tenor, en la ciudad de {{CONTRATO_CIUDAD_FIRMA}}, a los {{CONTRATO_FECHA_INICIO_DIA}} dias del mes de {{CONTRATO_FECHA_INICIO_MES}} del ano {{CONTRATO_FECHA_INICIO_ANIO}}.

EL ARRENDADOR                    EL ARRENDATARIO                    EL DEUDOR SOLIDARIO
Nombre: {{ARRENDADOR_NOMBRE}}    Nombre: {{ARRENDATARIO_NOMBRE}}    Nombre: {{DEUDOR_SOLIDARIO_NOMBRE}}
C.C. No: {{ARRENDADOR_CEDULA}}   C.C. No: {{ARRENDATARIO_CEDULA}}   C.C. No: {{DEUDOR_SOLIDARIO_CEDULA}}
Firma: _____________             Firma: _____________               Firma: _____________
`

/**
 * Reemplaza los marcadores de posicion en la plantilla del contrato con los datos reales
 */
export function llenarPlantillaContrato(datos: DatosContrato): string {
  let contrato = CONTRATO_PLANTILLA

  // Funcion auxiliar para formatear numeros como moneda colombiana
  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(valor).replace('$', '').replace(',00', '').trim()
  }

  // Funcion auxiliar para convertir numero a letras (simplificado)
  const numeroALetras = (num: number): string => {
    if (num === 1) return 'uno'
    if (num === 2) return 'dos'
    if (num === 3) return 'tres'
    if (num === 4) return 'cuatro'
    if (num === 5) return 'cinco'
    if (num === 6) return 'seis'
    if (num === 7) return 'siete'
    if (num === 8) return 'ocho'
    if (num === 9) return 'nueve'
    if (num === 10) return 'diez'
    if (num === 11) return 'once'
    if (num === 12) return 'doce'
    if (num === 24) return 'veinticuatro'
    if (num === 36) return 'treinta y seises'
    return num.toString()
  }

  // Funcion para formatear fecha
  const formatearFecha = (fecha: string): { dia: string, mes: string, anio: string } => {
    const date = new Date(fecha)
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

    return {
      dia: date.getDate().toString(),
      mes: meses[date.getMonth()],
      anio: date.getFullYear().toString()
    }
  }

  const fechaInicio = formatearFecha(datos.contrato_fecha_inicio)

  // Datos del arrendatario
  contrato = contrato.replace(/\{\{ARRENDATARIO_NOMBRE\}\}/g, datos.arrendatario_nombre || '________________________')
  contrato = contrato.replace(/\{\{ARRENDATARIO_CEDULA\}\}/g, datos.arrendatario_cedula || '________________________')
  contrato = contrato.replace(/\{\{ARRENDATARIO_CEDULA_EXPEDICION\}\}/g, datos.arrendatario_cedula_expedicion || '________________________')
  contrato = contrato.replace(/\{\{ARRENDATARIO_DIRECCION\}\}/g, datos.arrendatario_direccion || '________________________')
  contrato = contrato.replace(/\{\{ARRENDATARIO_EMAIL\}\}/g, datos.arrendatario_email || '________________________')
  contrato = contrato.replace(/\{\{ARRENDATARIO_CELULAR\}\}/g, datos.arrendatario_celular || '________________________')

  // Datos del deudor solidario
  contrato = contrato.replace(/\{\{DEUDOR_SOLIDARIO_NOMBRE\}\}/g, datos.deudor_solidario_nombre || 'NO APLICA')
  contrato = contrato.replace(/\{\{DEUDOR_SOLIDARIO_CEDULA\}\}/g, datos.deudor_solidario_cedula || 'NO APLICA')
  contrato = contrato.replace(/\{\{DEUDOR_SOLIDARIO_CEDULA_EXPEDICION\}\}/g, datos.deudor_solidario_cedula_expedicion || 'NO APLICA')
  contrato = contrato.replace(/\{\{DEUDOR_SOLIDARIO_DIRECCION\}\}/g, datos.deudor_solidario_direccion || 'NO APLICA')
  contrato = contrato.replace(/\{\{DEUDOR_SOLIDARIO_EMAIL\}\}/g, datos.deudor_solidario_email || 'NO APLICA')
  contrato = contrato.replace(/\{\{DEUDOR_SOLIDARIO_CELULAR\}\}/g, datos.deudor_solidario_celular || 'NO APLICA')

  // Datos del propietario/arrendador
  contrato = contrato.replace(/\{\{ARRENDADOR_NOMBRE\}\}/g, datos.propietario_nombre || '________________________')
  contrato = contrato.replace(/\{\{ARRENDADOR_CEDULA\}\}/g, datos.propietario_cedula || '________________________')
  contrato = contrato.replace(/\{\{ARRENDADOR_CEDULA_EXPEDICION\}\}/g, datos.propietario_cedula || '________________________')
  contrato = contrato.replace(/\{\{ARRENDADOR_DIRECCION\}\}/g, datos.propiedad_direccion || '________________________')
  contrato = contrato.replace(/\{\{ARRENDADOR_EMAIL\}\}/g, datos.propietario_email || '________________________')
  contrato = contrato.replace(/\{\{ARRENDADOR_CELULAR\}\}/g, '________________________') // No disponible

  // Datos de la propiedad
  contrato = contrato.replace(/\{\{PROPIEDAD_DIRECCION\}\}/g, datos.propiedad_direccion || '________________________')
  contrato = contrato.replace(/\{\{PROPIEDAD_MATRICULA\}\}/g, datos.propiedad_matricula || '________________________')
  contrato = contrato.replace(/\{\{PROPIEDAD_CUENTA_ENTIDAD\}\}/g, datos.propiedad_cuenta_entidad || '________________________')
  contrato = contrato.replace(/\{\{PROPIEDAD_CUENTA_TIPO\}\}/g, datos.propiedad_cuenta_tipo || '________________________')
  contrato = contrato.replace(/\{\{PROPIEDAD_CUENTA_NUMERO\}\}/g, datos.propiedad_cuenta_numero || '________________________')
  contrato = contrato.replace(/\{\{PROPIEDAD_CUENTA_TITULAR\}\}/g, datos.propiedad_cuenta_titular || '________________________')

  // Datos del contrato
  contrato = contrato.replace(/\{\{CONTRATO_CANON_COP\}\}/g, "$" + formatearMoneda(datos.contrato_canon_mensual))
  contrato = contrato.replace(/\{\{CONTRATO_DURACION_MESES\}\}/g, datos.contrato_duracion_meses.toString())
  contrato = contrato.replace(/\{\{CONTRATO_DURACION_MESES_EN_LETRAS\}\}/g, numeroALetras(datos.contrato_duracion_meses))
  contrato = contrato.replace(/\{\{CONTRATO_FECHA_INICIO_DIA\}\}/g, fechaInicio.dia)
  contrato = contrato.replace(/\{\{CONTRATO_FECHA_INICIO_MES\}\}/g, fechaInicio.mes)
  contrato = contrato.replace(/\{\{CONTRATO_FECHA_INICIO_ANIO\}\}/g, fechaInicio.anio)
  contrato = contrato.replace(/\{\{CONTRATO_CIUDAD_FIRMA\}\}/g, datos.contrato_ciudad_firma || '________________________')

  return contrato
}
