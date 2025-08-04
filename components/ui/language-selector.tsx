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
import { useRouter, usePathname } from "next/navigation"
import { useTransition } from "react"

const localeNames: Record<Locale, string> = {
  it: "🇮🇹 Italiano",
  en: "🇬🇧 English"
}

export function LanguageSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // Extract current locale from pathname
  const getCurrentLocale = (): Locale => {
    const pathSegments = pathname.split("/").filter(Boolean)
    if (pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)) {
      return pathSegments[0] as Locale
    }
    return 'it' // default fallback
  }

  const currentLocale = getCurrentLocale()

  function changeLanguage(newLocale: Locale) {
    if (newLocale === currentLocale) return // Don't change if same locale

    startTransition(() => {
      // Simple logic: replace the locale in the current path
      const pathSegments = pathname.split("/").filter(Boolean)
      
      // If the first segment is a locale, replace it
      if (pathSegments.length > 0 && locales.includes(pathSegments[0] as Locale)) {
        pathSegments[0] = newLocale
      } else {
        // If no locale found, prepend the new locale
        pathSegments.unshift(newLocale)
      }

      const newPath = "/" + pathSegments.join("/")
      console.log('Changing from', currentLocale, 'to', newLocale, 'new path:', newPath)
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
            className={`cursor-pointer ${currentLocale === loc ? "bg-accent text-accent-foreground" : ""}`}
          >
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
