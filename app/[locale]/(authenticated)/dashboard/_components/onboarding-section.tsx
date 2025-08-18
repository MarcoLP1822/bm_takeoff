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
import { Sparkles, HelpCircle, RefreshCw } from "lucide-react"

interface OnboardingSectionProps {
  isFirstTime: boolean
  onRefresh?: () => void
  refreshing?: boolean
  refreshLabel?: string
  translations?: {
    title?: string
    welcome?: string
    subtitle?: string
  }
}

export default function OnboardingSection({ 
  isFirstTime, 
  onRefresh, 
  refreshing = false, 
  refreshLabel = "Aggiorna",
  translations 
}: OnboardingSectionProps) {
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
    <div className="space-section">
      {/* Welcome Badge and Action Buttons */}
      <div className="flex flex-col justify-between gap-component sm:flex-row sm:items-center">
        <div className="flex items-center gap-element">
          {isFirstTime && (
            <Badge variant="secondary" className="inline-flex">
              <Sparkles className="mr-1 icon-xs" />
              Benvenuto!
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-element">
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-2 icon-sm ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshLabel}
            </Button>
          )}
          
          {/* Help Button */}
          {!isFirstTime && (
            <Button
              onClick={() => setShowHelp(true)}
              variant="ghost"
              size="sm"
            >
              <HelpCircle className="mr-2 icon-sm" />
              Aiuto
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
