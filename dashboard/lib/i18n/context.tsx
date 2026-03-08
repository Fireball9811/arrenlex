"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { translations, type Lang } from "./translations"

type LangContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: typeof translations.es
}

const LangContext = createContext<LangContextValue>({
  lang: "es",
  setLang: () => {},
  t: translations.es,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es")

  useEffect(() => {
    const saved = localStorage.getItem("arrenlex-lang") as Lang | null
    if (saved === "es" || saved === "en") {
      setLangState(saved)
    }
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem("arrenlex-lang", l)
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
