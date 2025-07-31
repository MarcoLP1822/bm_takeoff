type Props = {
  params: Promise<{ locale: string }>
}

// Landing page con i18n
export default async function RootPage({ params }: Props) {
  const { locale } = await params
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          {locale === 'it' ? 'Benvenuto!' : 'Welcome!'}
        </h1>
        <p className="text-lg mb-8">
          {locale === 'it' 
            ? 'Sistema di internazionalizzazione funzionante!' 
            : 'Internationalization system working!'
          }
        </p>
        <div className="space-x-4">
          <a 
            href={`/${locale}/dashboard`} 
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            {locale === 'it' ? 'Vai alla Dashboard' : 'Go to Dashboard'}
          </a>
          <a 
            href={locale === 'it' ? '/en' : '/it'} 
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            {locale === 'it' ? 'Switch to English' : 'Passa all\'Italiano'}
          </a>
        </div>
      </div>
    </div>
  )
}
