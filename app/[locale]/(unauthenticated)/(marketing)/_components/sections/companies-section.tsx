import { getTranslations } from "next-intl/server"
import { CompaniesSectionClient } from "./companies-section-client"

export async function CompaniesSection() {
  const t = await getTranslations("marketing.companies")
  
  const translations = {
    title: t("title"),
    subtitle: t("subtitle"),
    stats: {
      githubStars: t("stats.githubStars"),
      activeProjects: t("stats.activeProjects"),
      contributors: t("stats.contributors")
    }
  }

  return <CompaniesSectionClient translations={translations} />
}
