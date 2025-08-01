type Props = {
  params: Promise<{ locale: string }>
}

// Landing page con i18n
export default async function RootPage({ params }: Props) {
  const { locale } = await params

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">
          {locale === "it" ? "Benvenuto!" : "Welcome!"}
        </h1>
        <p className="mb-8 text-lg">
          {locale === "it"
            ? "Sistema di internazionalizzazione funzionante!"
            : "Internationalization system working!"}
        </p>
        <div className="space-x-4">
          <a
            href={`/${locale}/dashboard`}
            className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            {locale === "it" ? "Vai alla Dashboard" : "Go to Dashboard"}
          </a>
          <a
            href={locale === "it" ? "/en" : "/it"}
            className="rounded bg-gray-600 px-6 py-2 text-white hover:bg-gray-700"
          >
            {locale === "it" ? "Switch to English" : "Passa all'Italiano"}
          </a>
        </div>
      </div>
    </div>
  )
}
