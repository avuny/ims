import { Navbar } from "@workspace/ui/blocks/layout/navbar"
import LanguageSwitcher from "@workspace/ui/blocks/settings/langauge-switcher"
import { useTranslation } from "react-i18next"
export function App() {
  const { t, i18n } = useTranslation()
  const changeLanguage = (lng: "en" | "ar") => {
    i18n.changeLanguage(lng)
  }
  return (
    <>
      <Navbar
        end={
          <LanguageSwitcher
            locale={i18n.language as "en" | "ar"}
            updateLocale={changeLanguage}
          />
        }
      />
      <div className="flex min-h-svh p-6">
        <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
          <h1>{t("common.welcome")}</h1>
          <div className="font-mono text-xs text-muted-foreground">
            (Press <kbd>d</kbd> to toggle dark mode)
          </div>
        </div>
      </div>
    </>
  )
}
