/**
 * OnboardingSection Component  
 * Extracted from DashboardOverview for better modularity
 */
"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import OnboardingFlow from "@/components/utility/onboarding-flow"
import HelpDocumentation from "@/components/utility/help-documentation"
import { Sparkles, HelpCircle } from "lucide-react"

interface OnboardingSectionProps {
  isFirstTime: boolean
  translations: {
    title: string
    welcome: string
    subtitle: string
  }
}

export default function OnboardingSection({ isFirstTime, translations }: OnboardingSectionProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    // Show onboarding for new users or if they haven't dismissed it
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding")
    if (isFirstTime && !hasSeenOnboarding) {
      setShowOnboarding(true)
    }
  }, [isFirstTime])

  const handleCloseOnboarding = () => {
    setShowOnboarding(false)
    localStorage.setItem("hasSeenOnboarding", "true")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {translations.title}
            </h1>
            {isFirstTime && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                <Sparkles className="mr-1 h-3 w-3" />
                Welcome!
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            {isFirstTime
              ? translations.welcome
              : translations.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isFirstTime && (
            <Button
              onClick={() => setShowHelp(true)}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help
            </Button>
          )}
        </div>
      </div>

      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow
          onCloseAction={handleCloseOnboarding}
          className="mb-6"
        />
      )}

      {/* Help Documentation */}
      {showHelp && (
        <HelpDocumentation
          onCloseAction={() => setShowHelp(false)}
          className="mb-6"
        />
      )}
    </div>
  )
}
