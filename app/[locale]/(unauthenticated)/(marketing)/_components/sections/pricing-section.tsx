import { getTranslations } from "next-intl/server"
import { PricingSectionClient } from "./pricing-section-client"

export async function PricingSection() {
  const t = await getTranslations("marketing.pricing")
  
  const translations = {
    title: t("title"),
    subtitle: t("subtitle"),
    free: {
      title: t("free.title"),
      price: t("free.price"),
      period: t("free.period"),
      description: t("free.description"),
      cta: t("free.cta")
    },
    pro: {
      title: t("pro.title"),
      price: t("pro.price"),
      period: t("pro.period"),
      description: t("pro.description"),
      cta: t("pro.cta")
    }
  }

  return <PricingSectionClient translations={translations} />
}
