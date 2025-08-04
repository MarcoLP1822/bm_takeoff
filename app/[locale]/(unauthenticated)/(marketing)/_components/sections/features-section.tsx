import {
  BarChart,
  Code2,
  CreditCard,
  Database,
  Palette,
  Shield
} from "lucide-react"
import { getTranslations } from "next-intl/server"
import { FeaturesSectionClient } from "./features-section-client"

export async function FeaturesSection() {
  const t = await getTranslations("marketing.features")
  
  const translations = {
    subtitle: t("badge"),
    title: t("title"),
    description: t("subtitle"),
    features: {
      authentication: {
        title: t("auth.title"),
        description: t("auth.description")
      },
      payments: {
        title: t("payments.title"),
        description: t("payments.description")
      },
      database: {
        title: t("database.title"),
        description: t("database.description")
      },
      ui: {
        title: t("ui.title"),
        description: t("ui.description")
      },
      typescript: {
        title: t("typescript.title"),
        description: t("typescript.description")
      },
      analytics: {
        title: t("analytics.title"),
        description: t("analytics.description")
      }
    }
  }

  return <FeaturesSectionClient translations={translations} />
}
