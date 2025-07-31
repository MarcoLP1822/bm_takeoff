import { useTranslations } from 'next-intl'

// Hook per le traduzioni della navigazione
export function useNavigationTranslations() {
  return useTranslations('navigation')
}

// Hook per le traduzioni del dashboard
export function useDashboardTranslations() {
  return useTranslations('dashboard')
}

// Hook per le traduzioni dei libri
export function useBooksTranslations() {
  return useTranslations('books')
}

// Hook per le traduzioni dei contenuti
export function useContentTranslations() {
  return useTranslations('content')
}

// Hook per le traduzioni social
export function useSocialTranslations() {
  return useTranslations('social')
}

// Hook per le traduzioni analytics
export function useAnalyticsTranslations() {
  return useTranslations('analytics')
}

// Hook per le traduzioni di autenticazione
export function useAuthTranslations() {
  return useTranslations('auth')
}

// Hook per le traduzioni comuni
export function useCommonTranslations() {
  return useTranslations('common')
}

// Hook per le traduzioni delle impostazioni
export function useSettingsTranslations() {
  return useTranslations('settings')
}

// Hook per le traduzioni dei form
export function useFormsTranslations() {
  return useTranslations('forms')
}

// Hook per le traduzioni degli errori
export function useErrorsTranslations() {
  return useTranslations('errors')
}

// Hook per le traduzioni dei pagamenti
export function usePaymentsTranslations() {
  return useTranslations('payments')
}
