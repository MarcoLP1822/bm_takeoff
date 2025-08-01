"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { locales, type Locale } from "@/i18n"
import { Languages } from "lucide-react"
import { useLocale } from "next-intl"
import { useRouter, usePathname, useParams } from "next/navigation"
import { useTransition } from "react"

const localeNames: Record<Locale, string> = {
  it: "🇮🇹 Italiano",
  en: "🇬🇧 English"
}

export function LanguageSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const locale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()

  function changeLanguage(newLocale: Locale) {
    if (newLocale === locale) return // Don't change if same locale

    startTransition(() => {
      // Get current URL and split it into parts
      const url = new URL(window.location.href)
      const pathSegments = url.pathname.split("/").filter(Boolean) // Remove empty strings

      // First segment should be the locale
      if (
        pathSegments.length > 0 &&
        locales.includes(pathSegments[0] as Locale)
      ) {
        pathSegments[0] = newLocale // Replace the locale
      } else {
        pathSegments.unshift(newLocale) // Add locale if not present
      }

      const newPath = "/" + pathSegments.join("/")
      router.push(newPath)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 px-0"
          disabled={isPending}
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">Cambia lingua</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map(loc => (
          <DropdownMenuItem
            key={loc}
            onSelect={() => changeLanguage(loc)}
            className={`cursor-pointer ${locale === loc ? "bg-accent" : ""}`}
          >
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
