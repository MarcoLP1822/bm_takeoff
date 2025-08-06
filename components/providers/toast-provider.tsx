'use client'

import { createContext, useContext, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { setToastTranslations } from '@/lib/toast-service-i18n'

interface ToastProviderProps {
  children: React.ReactNode
}

const ToastContext = createContext<null>(null)

export function ToastProvider({ children }: ToastProviderProps) {
  const t = useTranslations()

  useEffect(() => {
    // Imposta le traduzioni per il toast service
    setToastTranslations((key: string) => {
      try {
        return t(key)
      } catch {
        return key
      }
    })
  }, [t])

  return (
    <ToastContext.Provider value={null}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToastProvider() {
  const context = useContext(ToastContext)
  return context
}
