import { Button } from "@/components/ui/button"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { HeroSectionClient } from "./hero-section-client"

export async function HeroSection() {
  const t = await getTranslations("marketing.hero")
  
  const heroData = {
    badge: t("badge"),
    titlePart1: t("title"),
    titleHighlight: t("titleHighlight"),
    subtitle: t("subtitle"),
    ctaPrimary: t("ctaPrimary"),
    ctaSecondary: t("ctaSecondary"),
    trustIndicators: {
      modernTech: t("trustIndicators.modernTech"),
      productionReady: t("trustIndicators.productionReady"),
      continuousUpdates: t("trustIndicators.continuousUpdates")
    }
  }

  return <HeroSectionClient translations={heroData} />
}
