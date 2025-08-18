import { getTranslations } from "next-intl/server"
import DashboardOverviewWrapper from "./_components/dashboard-overview-wrapper"
import { PageHeader } from "@/components/ui/page-header"

export default async function Page() {
  const t = await getTranslations("dashboard")
  const tNav = await getTranslations("navigation")
  
  const translations = {
    title: t("title"),
    welcome: t("welcome"),
    subtitle: t("subtitle"),
    stats: {
      totalBooks: t("stats.totalBooks"),
      totalContent: t("stats.totalContent"),
      socialPosts: t("stats.socialPosts"),
      engagement: t("stats.engagement")
    },
    buttons: {
      uploadBook: t("buttons.uploadBook"),
      generateContent: t("buttons.generateContent"),
      connectAccounts: t("buttons.connectAccounts"),
      viewAnalytics: t("buttons.viewAnalytics"),
      viewAllBooks: t("buttons.viewAllBooks"),
      viewAllContent: t("buttons.viewAllContent"),
      refresh: t("buttons.refresh"),
      tryAgain: t("buttons.tryAgain")
    },
    sections: {
      recentBooks: t("sections.recentBooks"),
      recentContent: t("sections.recentContent"),
      performanceOverview: t("sections.performanceOverview"),
      quickActions: t("sections.quickActions")
    },
    descriptions: {
      booksInLibrary: t("descriptions.booksInLibrary"),
      socialMediaPosts: t("descriptions.socialMediaPosts"), 
      postsReadyToPublish: t("descriptions.postsReadyToPublish"),
      likesSharesComments: t("descriptions.likesSharesComments"),
      recentBooksDesc: t("descriptions.recentBooksDesc"),
      recentContentDesc: t("descriptions.recentContentDesc"),
      quickActionsDesc: t("descriptions.quickActionsDesc"),
      uploadBookDesc: t("descriptions.uploadBookDesc"),
      generateContentDesc: t("descriptions.generateContentDesc"),
      connectAccountsDesc: t("descriptions.connectAccountsDesc"),
      viewAnalyticsDesc: t("descriptions.viewAnalyticsDesc"),
      noDataThisWeek: t("descriptions.noDataThisWeek"),
      noContentYet: t("descriptions.noContentYet"),
      generateFirstContent: t("descriptions.generateFirstContent"),
      noBooksYet: t("descriptions.noBooksYet"),
      uploadFirstBookDesc: t("descriptions.uploadFirstBookDesc"),
      uploadYourFirstBook: t("descriptions.uploadYourFirstBook"),
      generatedToday: t("descriptions.generatedToday")
    },
    status: {
      analyzing: t("status.analyzing"),
      completed: t("status.completed"),
      error: t("status.error")
    },
    errors: {
      unableToLoadDashboard: t("errors.unableToLoadDashboard")
    }
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        icon="LayoutDashboard"
        title={tNav('dashboard')}
        description="Panoramica generale del tuo account e attività"
      />
      <DashboardOverviewWrapper translations={translations} />
    </div>
  )
}
