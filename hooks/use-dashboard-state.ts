/**
 * Central dashboard state management hook
 * Coordinates all dashboard-related state and actions
 */
"use client"

import { useState, useCallback } from "react"
import { useDashboardStats } from "./use-dashboard-stats"
import { useDashboardNotifications } from "./use-dashboard-notifications"

interface UseDashboardStateReturn {
  // Data state
  stats: ReturnType<typeof useDashboardStats>["stats"]
  quickStats: ReturnType<typeof useDashboardStats>["quickStats"]
  loading: boolean
  error: string | null
  refreshing: boolean
  isFirstTime: boolean
  
  // Actions
  refreshData: () => Promise<void>
  
  // Notifications
  notifications: ReturnType<typeof useDashboardNotifications>["notifications"]
  longRunningOperations: ReturnType<typeof useDashboardNotifications>["longRunningOperations"]
  addNotification: ReturnType<typeof useDashboardNotifications>["addNotification"]
  simulateLongRunningOperation: ReturnType<typeof useDashboardNotifications>["simulateLongRunningOperation"]
  formatTimeAgo: ReturnType<typeof useDashboardNotifications>["formatTimeAgo"]
  
  // UI state
  showOnboarding: boolean
  setShowOnboarding: (show: boolean) => void
}

export function useDashboardState(): UseDashboardStateReturn {
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Stats management
  const {
    stats,
    quickStats,
    loading,
    error,
    refreshing,
    isFirstTime,
    refreshData
  } = useDashboardStats()
  
  // Notifications management
  const {
    notifications,
    longRunningOperations,
    addNotification,
    simulateLongRunningOperation,
    formatTimeAgo
  } = useDashboardNotifications()
  
  return {
    // Data state
    stats,
    quickStats,
    loading,
    error,
    refreshing,
    isFirstTime,
    
    // Actions
    refreshData,
    
    // Notifications
    notifications,
    longRunningOperations,
    addNotification,
    simulateLongRunningOperation,
    formatTimeAgo,
    
    // UI state
    showOnboarding,
    setShowOnboarding
  }
}
