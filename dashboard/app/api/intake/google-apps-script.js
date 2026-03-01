/**
 * Google Apps Script – Conector Google Forms → Arrenlex (enfoque escalable JSONB)
 *
 * VENTAJA: Cualquier pregunta nueva que agregues al formulario se guardará
 * automáticamente en Supabase SIN necesidad de modificar este script ni la tabla.
 *
 * INSTRUCCIONES:
 * 1. Abre tu Google Form
 * 2. Click en los tres puntos (⋮) → "Editor de secuencias de comandos"
 * 3. Borra todo el contenido y pega este script completo
 * 4. Cambia WEBHOOK_URL con la URL real de tu app desplegada
 * 5. Guarda (Ctrl+S)
 * 6. Ve a "Activadores" (ícono del reloj) → Agrega activador:
 *    - Función: onFormSubmit
 *    - Fuente del evento: Del formulario
 *    - Tipo de evento: Al enviar el formulario
 * 7. Autoriza los permisos cuando te lo pida
 */

var WEBHOOK_URL = "https://TU-DOMINIO.vercel.app/api/intake/google-forms";
// Ejemplo: "https://arrenlex.vercel.app/api/intake/google-forms"

function onFormSubmit(e) {
  try {
    var nv = e.namedValues;

    // Guarda todas las respuestas tal cual, con el nombre original de la pregunta.
    // Si agregas nuevas preguntas al form, se guardan solas sin tocar este script.
    var rawData = {};
    Object.keys(nv).forEach(function(pregunta) {
      var respuesta = nv[pregunta][0];
      rawData[pregunta] = (respuesta !== undefined && respuesta !== "") ? respuesta : null;
    });

    var payload = {
      fecha_envio: new Date().toISOString(),
      // Todos los campos del formulario van dentro de raw_data
      // El endpoint los separa y los guarda en la columna JSONB
    };

    // Pasamos los campos directamente en el body (el endpoint los mueve a raw_data)
    Object.keys(rawData).forEach(function(key) {
      payload[key] = rawData[key];
    });

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var code = response.getResponseCode();

    if (code === 201) {
      Logger.log("✓ Enviado correctamente a Arrenlex.");
    } else {
      Logger.log("✗ Error al enviar. Código HTTP: " + code);
      Logger.log("Respuesta: " + response.getContentText());
    }

  } catch (err) {
    Logger.log("Excepción en onFormSubmit: " + err.toString());
  }
}
