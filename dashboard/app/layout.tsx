import "./globals.css"
import { ReactNode } from "react"
import { LangProvider } from "@/lib/i18n/context"

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
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
