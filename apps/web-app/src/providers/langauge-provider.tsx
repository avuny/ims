import { useEffect, useState } from "react"
import i18n from "@/i18n" // Adjust this path to where your i18n.ts is located
import { DirectionProvider } from "@workspace/ui/components/direction"

const rtlLanguages = new Set(["ar", "he", "fa", "ur"])

interface LanguageProviderProps {
  children: React.ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [dir, setDir] = useState<"rtl" | "ltr">(
    rtlLanguages.has(i18n.language) ? "rtl" : "ltr"
  )

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      const isRtl = rtlLanguages.has(lng)
      const newDir = isRtl ? "rtl" : "ltr"

      // Update HTML attributes for Tailwind CSS
      document.documentElement.dir = newDir
      document.documentElement.lang = lng

      // Update React State for Base UI's DirectionProvider
      setDir(newDir)
    }

    // Set initial direction
    handleLanguageChange(i18n.language)

    // Listen to language changes anywhere in the app
    i18n.on("languageChanged", handleLanguageChange)

    return () => {
      i18n.off("languageChanged", handleLanguageChange)
    }
  }, [])

  return <DirectionProvider direction={dir}>{children}</DirectionProvider>
}
