import { Locale } from "@workspace/ui/types"
import React from "react"

import { createContext, useContext, useState } from "react"

export interface UserPreferencesContext {
  locale: Locale
  rtl: boolean
  updateLocale: (locale: Locale) => void
}

export const userPreferencesContext = createContext<UserPreferencesContext>({
  locale: "en",
  rtl: false,
  updateLocale: () => {},
})

export default function UserPreferencesContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (
        (document.cookie
          .split("; ")
          .find((row) => row.startsWith("locale="))
          ?.split("=")[1] as Locale) || "en"
      )
    }
    return "en"
  })

  const updateLocale = async (locale: Locale) => {
    setLocale(locale)

    // Update the cookie
    document.cookie = `locale=${locale}; path=/`

    // Refresh the page
    window.location.reload()
  }

  return (
    <userPreferencesContext.Provider
      value={{
        locale,
        rtl: locale === "ar" ? true : false,
        updateLocale,
      }}
    >
      {children}
    </userPreferencesContext.Provider>
  )
}

export function useUserPreferencesContext() {
  const context = useContext(userPreferencesContext)
  if (context === undefined) {
    throw new Error(
      "userPreferencesContext must be used within selectedWarehouseContext provider"
    )
  }

  return context
}
