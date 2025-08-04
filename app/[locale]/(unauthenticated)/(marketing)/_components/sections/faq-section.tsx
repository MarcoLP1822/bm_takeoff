import { getTranslations } from "next-intl/server"
import { FAQSectionClient } from "./faq-section-client"

export async function FAQSection() {
  const t = await getTranslations("marketing.faq")
  
  const translations = {
    title: t("title"),
    subtitle: t("subtitle"),
    questions: {
      whatIsThis: {
        question: t("questions.whatIsThis.question"),
        answer: t("questions.whatIsThis.answer")
      },
      howToStart: {
        question: t("questions.howToStart.question"),
        answer: t("questions.howToStart.answer")
      },
      isItFree: {
        question: t("questions.isItFree.question"),
        answer: t("questions.isItFree.answer")
      },
      supportIncluded: {
        question: t("questions.supportIncluded.question"),
        answer: t("questions.supportIncluded.answer")
      }
    }
  }

  return <FAQSectionClient translations={translations} />
}
