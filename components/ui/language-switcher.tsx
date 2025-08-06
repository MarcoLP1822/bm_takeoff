'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useTransition } from 'react'

interface LanguageSwitcherProps {
  variant?: 'select' | 'buttons'
  size?: 'sm' | 'md' | 'lg'
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' }
]

export function LanguageSwitcher({ variant = 'select', size = 'md' }: LanguageSwitcherProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('common')
  const [isPending, startTransition] = useTransition()

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      // Remove current locale from pathname
      const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/'
      
      // Navigate to new locale
      router.push(`/${newLocale}${pathWithoutLocale}`)
    })
  }

  const currentLanguage = languages.find(lang => lang.code === locale)

  if (variant === 'buttons') {
    return (
      <div className="flex gap-1">
        {languages.map((language) => (
          <Button
            key={language.code}
            variant={locale === language.code ? 'default' : 'outline'}
            size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
            onClick={() => handleLocaleChange(language.code)}
            disabled={isPending}
            className="flex items-center gap-2"
          >
            <span>{language.flag}</span>
            {size !== 'sm' && <span>{language.name}</span>}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <Select
      value={locale}
      onValueChange={handleLocaleChange}
      disabled={isPending}
    >
      <SelectTrigger className={`
        ${size === 'sm' ? 'h-8 w-auto px-2' : size === 'lg' ? 'h-12 w-44' : 'h-10 w-36'}
        flex items-center gap-2
      `}>
        <Globe className={`
          ${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}
        `} />
        <SelectValue>
          <div className="flex items-center gap-2">
            <span>{currentLanguage?.flag}</span>
            {size !== 'sm' && <span>{currentLanguage?.name}</span>}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            <div className="flex items-center gap-2">
              <span>{language.flag}</span>
              <span>{language.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default LanguageSwitcher
