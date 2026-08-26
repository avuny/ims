import { buttonVariants } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { type Locale } from "@workspace/ui/types"

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  ar: "AR",
}

export const SUPPORTED_LOCALES: Locale[] = Object.keys(
  LOCALE_LABELS
) as Locale[]

export type LanguageSwitcherProps = {
  updateLocale: (locale: Locale) => void
  locale: Locale
}

export default function LanguageSwitcher({
  locale,
  updateLocale,
}: LanguageSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({
          size: "icon",
          variant: "outline",
        })}
      >
        <div className="h-[1.2rem] w-[1.2rem]">
          {LOCALE_LABELS[locale] ?? "??"}
        </div>

        <span className="sr-only">Language Switcher</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((loc) => (
          <DropdownMenuCheckboxItem
            key={loc}
            checked={locale === loc}
            onCheckedChange={() => updateLocale(loc)}
          >
            {LOCALE_LABELS[loc]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
