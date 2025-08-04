import { getTranslations } from "next-intl/server"
import { VideoSectionClient } from "./video-section-client"

export async function VideoSection() {
  const t = await getTranslations("marketing.video")
  
  const translations = {
    title: t("title"),
    subtitle: t("subtitle"),
    playButton: t("playButton")
  }

  return <VideoSectionClient translations={translations} />
}
