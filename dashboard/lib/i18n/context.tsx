"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { translations, type Lang } from "./translations"

type Translations = typeof translations.es

type LangContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translations
}

const LangContext = createContext<LangContextValue>({
  lang: "es",
  setLang: () => {},
  t: translations.es,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es")

  function setLang(l: Lang) {
    setLangState(l)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("arrenlex-lang", l)
      } catch {
        // Ignore
      }
    }
  }

  // NO leer localStorage automáticamente para evitar problemas de hidratación
  // El idioma solo cambia cuando el usuario lo selecciona manualmente

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] as Translations }}>
      <div suppressHydrationWarning style={{ display: "contents" }}>
        {children}
      </div>
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
