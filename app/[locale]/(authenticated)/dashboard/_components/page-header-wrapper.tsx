'use client'

import { useTranslations } from 'next-intl'
import { LayoutDashboard } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export function PageHeaderWrapper() {
  const t = useTranslations('navigation')

  return (
    <PageHeader
      icon={LayoutDashboard}
      title={t('dashboard')}
      description="Panoramica generale del tuo account e attività"
    />
  )
}
