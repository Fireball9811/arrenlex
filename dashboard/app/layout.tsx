import "./globals.css"
import { ReactNode } from "react"

export const metadata = {
  title: "Arrenlex",
  description: "Sistema Arrenlex",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  )
}
