import { getTranslations } from "next-intl/server"
import DashboardOverview from "./_components/dashboard-overview"

export default async function Page() {
  const t = await getTranslations("dashboard")
  
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
      viewAllBooks: t("buttons.viewAllBooks"),
      viewAllContent: t("buttons.viewAllContent")
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
      noDataThisWeek: t("descriptions.noDataThisWeek"),
      noContentYet: t("descriptions.noContentYet"),
      generateFirstContent: t("descriptions.generateFirstContent")
    }
  }
  
  return <DashboardOverview translations={translations} />
}
