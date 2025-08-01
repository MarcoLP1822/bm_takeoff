"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Trash2,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { SocialAccount, SocialPlatform } from "@/lib/social-media"

const platformConfig = {
  twitter: {
    name: "Twitter/X",
    icon: Twitter,
    color: "bg-black text-white",
    description: "Share book insights and quotes"
  },
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    description: "Visual content and story highlights"
  },
  linkedin: {
    name: "LinkedIn",
    icon: Linkedin,
    color: "bg-blue-600 text-white",
    description: "Professional book discussions"
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "bg-blue-500 text-white",
    description: "Engage with reading communities"
  }
}

interface SocialAccountsManagerProps {
  className?: string
}

export function SocialAccountsManager({
  className
}: SocialAccountsManagerProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()

    // Check for OAuth callback results in URL params
    const urlParams = new URLSearchParams(window.location.search)
    const connected = urlParams.get("connected")
    const error = urlParams.get("error")

    if (connected) {
      toast.success(
        `Successfully connected ${platformConfig[connected as SocialPlatform]?.name}`
      )
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname)
    }

    if (error) {
      toast.error(decodeURIComponent(error))
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/social/accounts")
      if (!response.ok) throw new Error("Failed to fetch accounts")

      const data = await response.json()
      setAccounts(data.accounts)
    } catch (error) {
      console.error("Error fetching accounts:", error)
      setError("Failed to load social media accounts")
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (platform: SocialPlatform) => {
    setConnecting(platform)
    setError(null)

    try {
      const response = await fetch(`/api/social/connect/${platform}`)
      if (!response.ok) throw new Error("Failed to generate auth URL")

      const data = await response.json()

      // Redirect to OAuth provider
      window.location.href = data.authUrl
    } catch (error) {
      console.error("Error connecting account:", error)
      toast.error(`Failed to connect ${platformConfig[platform].name}`)
      setConnecting(null)
    }
  }

  const handleDisconnect = async (
    accountId: string,
    platform: SocialPlatform
  ) => {
    try {
      const response = await fetch(`/api/social/accounts/${accountId}`, {
        method: "DELETE"
      })

      if (!response.ok) throw new Error("Failed to disconnect account")

      toast.success(`Disconnected ${platformConfig[platform].name}`)
      fetchAccounts() // Refresh the list
    } catch (error) {
      console.error("Error disconnecting account:", error)
      toast.error(`Failed to disconnect ${platformConfig[platform].name}`)
    }
  }

  const getAccountStatus = (account: SocialAccount) => {
    if (!account.isActive) {
      return {
        status: "inactive",
        color: "destructive" as const,
        icon: XCircle
      }
    }

    if (account.tokenExpiresAt && new Date() >= account.tokenExpiresAt) {
      return {
        status: "expired",
        color: "warning" as const,
        icon: AlertTriangle
      }
    }

    return { status: "active", color: "success" as const, icon: CheckCircle }
  }

  const getConnectedAccount = (platform: SocialPlatform) => {
    return accounts.find(
      account => account.platform === platform && account.isActive
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Object.keys(platformConfig).map(platform => (
          <Card key={platform}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 animate-pulse rounded bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Social Media Accounts</h2>
          <p className="text-muted-foreground">
            Connect your social media accounts to publish book-based content
            directly
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {Object.entries(platformConfig).map(([platform, config]) => {
            const connectedAccount = getConnectedAccount(
              platform as SocialPlatform
            )
            const Icon = config.icon
            const isConnecting = connecting === platform

            return (
              <Card key={platform}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`rounded-lg p-2 ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{config.name}</CardTitle>
                        <CardDescription>{config.description}</CardDescription>
                      </div>
                    </div>

                    {connectedAccount && (
                      <Badge
                        variant={getAccountStatus(connectedAccount).color}
                        className="flex items-center gap-1"
                      >
                        {React.createElement(
                          getAccountStatus(connectedAccount).icon,
                          {
                            className: "h-3 w-3"
                          }
                        )}
                        {getAccountStatus(connectedAccount).status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {connectedAccount ? (
                    <div className="space-y-4">
                      <div className="bg-muted flex items-center justify-between rounded-lg p-3">
                        <div>
                          <p className="font-medium">
                            {connectedAccount.accountName}
                          </p>
                          {connectedAccount.accountHandle && (
                            <p className="text-muted-foreground text-sm">
                              @{connectedAccount.accountHandle}
                            </p>
                          )}
                          <p className="text-muted-foreground text-xs">
                            Connected{" "}
                            {new Date(
                              connectedAccount.createdAt
                            ).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {getAccountStatus(connectedAccount).status ===
                            "expired" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleConnect(platform as SocialPlatform)
                              }
                              disabled={isConnecting}
                            >
                              <RefreshCw className="mr-1 h-4 w-4" />
                              Reconnect
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDisconnect(
                                connectedAccount.id,
                                platform as SocialPlatform
                              )
                            }
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Disconnect
                          </Button>
                        </div>
                      </div>

                      {getAccountStatus(connectedAccount).status ===
                        "expired" && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Your access token has expired. Please reconnect your
                            account to continue publishing.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleConnect(platform as SocialPlatform)}
                      disabled={isConnecting}
                      className="w-full"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Connect {config.name}
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Separator />

        <div className="text-muted-foreground space-y-2 text-sm">
          <p>
            <strong>Privacy Notice:</strong> We only request the minimum
            permissions needed to publish content on your behalf.
          </p>
          <p>
            <strong>Security:</strong> Your access tokens are encrypted and
            stored securely. You can disconnect any account at any time.
          </p>
        </div>
      </div>
    </div>
  )
}
