import "./globals.css"
import type { Metadata } from "next"
import { ReactNode } from "react"
import { LangProvider } from "@/lib/i18n/context"

export const metadata: Metadata = {
  title: "Arrenlex",
  description: "Sistema de Gestión de Arrendamientos",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="shortcut icon" type="image/png" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body suppressHydrationWarning>
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
