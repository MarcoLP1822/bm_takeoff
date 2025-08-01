import { useTranslations } from "next-intl"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const t = useTranslations("errors")

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-700 dark:text-gray-300">
          {t("notFound")}
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t("tryAgain")}</p>
        <Button asChild className="mt-6">
          <Link href="/">Torna alla Homepage</Link>
        </Button>
      </div>
    </div>
  )
}
