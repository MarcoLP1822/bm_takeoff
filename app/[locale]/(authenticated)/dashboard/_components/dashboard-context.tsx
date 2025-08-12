"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { type Locale } from "@/i18n"

interface UserData {
  name: string
  email: string
  avatar: string
  membership: string
  onboardingCompleted: boolean
}

interface DashboardContextType {
  userData: UserData
  locale: Locale
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

interface DashboardProviderProps {
  children: ReactNode
  userData: UserData
  locale: Locale
}

export function DashboardProvider({ children, userData, locale }: DashboardProviderProps) {
  return (
    <DashboardContext.Provider value={{ userData, locale }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider")
  }
  return context
}
