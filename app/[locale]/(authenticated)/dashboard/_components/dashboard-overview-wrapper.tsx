"use client"

import { useDashboard } from "./dashboard-context"
import DashboardOverview from "./dashboard-overview"

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

interface DashboardOverviewWrapperProps {
  translations: DashboardTranslations
}

export default function DashboardOverviewWrapper({ translations }: DashboardOverviewWrapperProps) {
  const { userData } = useDashboard()
  
  return (
    <DashboardOverview 
      translations={translations} 
      onboardingCompleted={userData.onboardingCompleted}
    />
  )
}
