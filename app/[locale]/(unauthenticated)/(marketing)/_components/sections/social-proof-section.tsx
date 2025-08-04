import { getTranslations } from "next-intl/server";
import { SocialProofSectionClient } from "./social-proof-section-client";

export async function SocialProofSection() {
  const t = await getTranslations("marketing.socialProof");
  
  const translations = {
    title: t("title"),
    subtitle: t("subtitle"),
    stats: {
      customers: t("stats.customers"),
      satisfaction: t("stats.satisfaction"), 
      reviews: t("stats.reviews")
    }
  };

  return <SocialProofSectionClient translations={translations} />;
}
