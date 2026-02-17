/**
 * Descarga un archivo desde una URL y lo guarda en la carpeta de descargas del usuario
 * (Downloads) con el nombre indicado. Usa fetch + blob + <a download> para que
 * funcione con URLs cross-origin (p. ej. Supabase signed URLs).
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Error al descargar")
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objectUrl
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
