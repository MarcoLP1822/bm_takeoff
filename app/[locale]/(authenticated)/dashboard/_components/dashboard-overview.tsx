/**
 * Refactored DashboardOverview Component
 * Phase 2.2: Modular architecture with separated concerns
 * 
 * This component orchestrates all dashboard sections using:
 * - Custom hooks for state management
 * - Separated UI components for each section
 * - Error boundaries for better error handling
 * - Improved maintainability and testability
 */
"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

// Hooks
import { useDashboardState } from "@/hooks/use-dashboard-state"

// Components
import OnboardingSection from "./onboarding-section"
import DashboardStatsCards from "./dashboard-stats-cards"
import RecentBooks from "./recent-books"
import RecentContent from "./recent-content"
import PerformanceOverview from "./performance-overview"
import QuickActions from "./quick-actions"
import NotificationsPanel from "./notifications-panel"
import MobileQuickNavigation from "./mobile-quick-navigation"
import WelcomeWizard from "@/components/utility/welcome-wizard"

interface DashboardTranslations {
  title: string
  welcome: string
  subtitle: string
  stats: {
    totalBooks: string
    totalContent: string
    socialPosts: string
    engagement: string
  }
  buttons: {
    uploadBook: string
    generateContent: string
    connectAccounts: string
    viewAnalytics: string
    viewAllBooks: string
    viewAllContent: string
    refresh: string
    tryAgain: string
  }
  sections: {
    recentBooks: string
    recentContent: string
    performanceOverview: string
    quickActions: string
  }
  descriptions: {
    booksInLibrary: string
    socialMediaPosts: string
    postsReadyToPublish: string
    likesSharesComments: string
    recentBooksDesc: string
    recentContentDesc: string
    quickActionsDesc: string
    uploadBookDesc: string
    generateContentDesc: string
    connectAccountsDesc: string
    viewAnalyticsDesc: string
    noDataThisWeek: string
    noContentYet: string
    generateFirstContent: string
    noBooksYet: string
    uploadFirstBookDesc: string
    uploadYourFirstBook: string
    generatedToday: string
  }
  status: {
    analyzing: string
    completed: string
    error: string
  }
  errors: {
    unableToLoadDashboard: string
  }
}

interface DashboardOverviewProps {
  translations: DashboardTranslations
  onboardingCompleted?: boolean
}

export default function DashboardOverview({ 
  translations, 
  onboardingCompleted = true 
}: DashboardOverviewProps) {
  const {
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
    simulateLongRunningOperation,
    formatTimeAgo
  } = useDashboardState()

  // Se onboarding non completato, mostra wizard
  if (!onboardingCompleted) {
    return <WelcomeWizard translations={{
      title: translations.title,
      welcome: translations.welcome
    }} />
  }

  // Error state - if data fails to load completely
  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {translations.errors.unableToLoadDashboard}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {error}
          </p>
          <Button onClick={refreshData} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            {translations.buttons.tryAgain}
          </Button>
        </div>
      </div>
    )
  }

  // Loading state - show skeleton while data loads
  if (loading) {
    return <DashboardSkeleton />
  }

  const handleQuickActionClick = (action: string) => {
    // Simulate operations based on action type
    switch (action) {
      case "upload_book":
        simulateLongRunningOperation("book_analysis", "Analyzing uploaded book")
        break
      case "generate_content":
        simulateLongRunningOperation("content_generation", "Generating social media content")
        break
      default:
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Onboarding */}
      <OnboardingSection 
        isFirstTime={isFirstTime}
        onRefresh={refreshData}
        refreshing={refreshing}
        refreshLabel={translations.buttons.refresh}
      />

      {/* Notifications and Active Operations */}
      <NotificationsPanel
        notifications={notifications}
        longRunningOperations={longRunningOperations}
        formatTimeAgo={formatTimeAgo}
      />

      {/* Quick Stats Cards */}
      <DashboardStatsCards
        totalBooks={stats?.totalBooks || 0}
        generatedContent={stats?.generatedContent || 0}
        scheduledPosts={stats?.scheduledPosts || 0}
        totalEngagement={stats?.totalEngagement || 0}
        quickStats={quickStats}
        loading={loading}
        translations={{
          stats: translations.stats,
          descriptions: translations.descriptions
        }}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Books */}
        <RecentBooks
          books={stats?.recentBooks || []}
          loading={loading}
          translations={{
            sections: { recentBooks: translations.sections.recentBooks },
            descriptions: { 
              recentBooksDesc: translations.descriptions.recentBooksDesc,
              noBooksYet: translations.descriptions.noBooksYet,
              uploadFirstBookDesc: translations.descriptions.uploadFirstBookDesc,
              uploadYourFirstBook: translations.descriptions.uploadYourFirstBook
            },
            buttons: {
              uploadBook: translations.buttons.uploadBook,
              viewAllBooks: translations.buttons.viewAllBooks
            },
            status: {
              analyzing: translations.status.analyzing,
              completed: translations.status.completed,
              error: translations.status.error
            }
          }}
        />

        {/* Recent Content */}
        <RecentContent
          content={stats?.recentContent || []}
          loading={loading}
          translations={{
            sections: { recentContent: translations.sections.recentContent },
            descriptions: {
              recentContentDesc: translations.descriptions.recentContentDesc,
              noContentYet: translations.descriptions.noContentYet,
              generateFirstContent: translations.descriptions.generateFirstContent
            },
            buttons: { 
              generateContent: translations.buttons.generateContent,
              viewAllContent: translations.buttons.viewAllContent
            }
          }}
        />
      </div>

      {/* Analytics Overview */}
      <PerformanceOverview
        analytics={stats?.analytics || {
          weeklyEngagement: 0,
          topPerformingPlatform: "N/A",
          avgEngagementRate: 0
        }}
        loading={loading}
        translations={{
          sections: { performanceOverview: translations.sections.performanceOverview }
        }}
      />

      {/* Quick Actions */}
      <QuickActions
        loading={loading}
        onActionClick={handleQuickActionClick}
        translations={{
          sections: { quickActions: translations.sections.quickActions },
          descriptions: {
            quickActionsDesc: translations.descriptions.quickActionsDesc,
            uploadBookDesc: translations.descriptions.uploadBookDesc,
            generateContentDesc: translations.descriptions.generateContentDesc,
            connectAccountsDesc: translations.descriptions.connectAccountsDesc,
            viewAnalyticsDesc: translations.descriptions.viewAnalyticsDesc
          },
          buttons: {
            uploadBook: translations.buttons.uploadBook,
            generateContent: translations.buttons.generateContent,
            connectAccounts: translations.buttons.connectAccounts,
            viewAnalytics: translations.buttons.viewAnalytics
          }
        }}
      />

      {/* Mobile Quick Navigation */}
      <MobileQuickNavigation />
    </div>
  )
}

// Skeleton component for loading state
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-full sm:w-96 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden h-9 w-16 sm:block bg-gray-200 animate-pulse rounded" />
          <div className="h-9 w-20 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-4 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="space-y-2">
              <div className="mb-2 h-8 w-16 bg-gray-200 animate-pulse rounded" />
              <div className="h-3 w-32 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border">
            <div className="p-6">
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-2">
                  <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
                </div>
                <div className="h-9 w-24 bg-gray-200 animate-pulse rounded" />
              </div>
            </div>
            <div className="p-6 pt-0">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center space-x-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                      <div className="h-3 w-24 bg-gray-200 animate-pulse rounded" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional sections skeleton */}
      <div className="bg-white rounded-lg border p-6">
        <div className="h-6 w-40 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
              <div className="h-3 w-40 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
