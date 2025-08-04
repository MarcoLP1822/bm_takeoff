import { getTranslations } from "next-intl/server"
import { CTASectionClient } from "./cta-section-client"

export async function CTASection() {
  const t = await getTranslations("marketing.cta")
  
  const translations = {
    title: t("title"),
    subtitle: t("subtitle"),
    cloneTemplate: t("cloneTemplate"),
    getStarted: t("getStarted")
  }

  return <CTASectionClient translations={translations} />
}
