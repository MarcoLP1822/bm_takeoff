'use client'

import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/ui/page-header'
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"

export default function AnalyticsPage() {
  const t = useTranslations('navigation')

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        icon="BarChart3"
        title={t('analytics')}
        description="Monitora le performance dei tuoi contenuti social"
      />
      <AnalyticsDashboard />
    </div>
  )
}
