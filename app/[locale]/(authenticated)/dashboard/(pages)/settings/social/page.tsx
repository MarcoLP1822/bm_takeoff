import { SocialAccountsManager } from "@/components/social/social-accounts-manager"

export default function SocialSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Social Media Accounts
        </h1>
        <p className="text-muted-foreground">
          Connect your social media accounts to publish content directly from
          the platform.
        </p>
      </div>

      <SocialAccountsManager />
    </div>
  )
}
