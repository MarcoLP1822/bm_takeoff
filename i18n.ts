import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'

// Lista delle lingue supportate
export const locales = ['it', 'en'] as const
export type Locale = (typeof locales)[number]

// Lingua di default
export const defaultLocale: Locale = 'it'

export default getRequestConfig(async ({ locale }) => {
  // Use fallback to default locale if locale is invalid
  const resolvedLocale = locale && locales.includes(locale as Locale) ? locale : defaultLocale

  try {
    const messages = (await import(`./messages/${resolvedLocale}.json`)).default
    return {
      locale: resolvedLocale,
      messages
    }
  } catch (error) {
    // Fallback to empty messages instead of notFound
    return {
      locale: resolvedLocale,
      messages: {}
    }
  }
})
