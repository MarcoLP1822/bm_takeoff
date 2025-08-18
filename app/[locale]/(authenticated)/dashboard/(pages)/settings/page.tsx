'use client'

import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/ui/page-header'
import { SocialAccountsManager } from '@/components/social/social-accounts-manager'

export default function SettingsPage() {
  const t = useTranslations('navigation')

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        icon="Settings"
        title={t('settings')}
        description="Gestisci le tue impostazioni e account social"
      />
      <SocialAccountsManager />
    </div>
  )
}
