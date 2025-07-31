'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDashboardTranslations, useCommonTranslations } from '@/hooks/use-translations'
import { useLocale } from 'next-intl'

/**
 * Componente di esempio che dimostra l'uso delle traduzioni
 * Questo può essere utilizzato come riferimento per altri componenti
 */
export function I18nExampleComponent() {
  const t = useDashboardTranslations()
  const common = useCommonTranslations()
  const locale = useLocale()

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('welcome')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
        
        <div className="flex gap-2">
          <Button variant="default">
            {common('save')}
          </Button>
          <Button variant="outline">
            {common('cancel')}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Current locale: {locale}
        </div>
      </CardContent>
    </Card>
  )
}
