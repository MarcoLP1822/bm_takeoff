/**
 * QuickActions Component
 * Extracted from DashboardOverview for better modularity
 */
"use client"

import { Link } from "@/lib/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Zap, Users, BarChart3 } from "lucide-react"

interface QuickActionsProps {
  loading?: boolean
  onActionClick?: (action: string) => void
  translations?: {
    sections: {
      quickActions: string
    }
    descriptions: {
      quickActionsDesc: string
      uploadBookDesc: string
      generateContentDesc: string
      connectAccountsDesc: string
      viewAnalyticsDesc: string
    }
    buttons: {
      uploadBook: string
      generateContent: string
      connectAccounts: string
      viewAnalytics: string
    }
  }
}

export default function QuickActions({ loading = false, onActionClick, translations }: QuickActionsProps) {
  if (loading) {
    return <QuickActionsSkeleton />
  }

  const handleActionClick = (action: string) => {
    if (onActionClick) {
      onActionClick(action)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations?.sections.quickActions || "Quick Actions"}</CardTitle>
        <CardDescription>
          {translations?.descriptions.quickActionsDesc || "Common tasks to help you get started"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            asChild
            className="h-auto flex-col space-y-2 bg-gradient-to-br from-blue-500 to-blue-600 p-4 hover:from-blue-600 hover:to-blue-700"
            onClick={() => handleActionClick("upload_book")}
          >
            <Link href="/dashboard/books?action=upload">
              <Upload className="h-6 w-6" />
              <span className="text-sm font-medium">{translations?.buttons.uploadBook || "Upload Book"}</span>
              <span className="text-xs opacity-90">{translations?.descriptions.uploadBookDesc || "PDF, EPUB, TXT, DOCX"}</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto flex-col space-y-2 p-4 hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-950/20"
            onClick={() => handleActionClick("generate_content")}
          >
            <Link href="/dashboard/content/generate">
              <Zap className="h-6 w-6 text-green-600" />
              <span className="text-sm font-medium">{translations?.buttons.generateContent || "Generate Content"}</span>
              <span className="text-muted-foreground text-xs">
                {translations?.descriptions.generateContentDesc || "AI-powered posts"}
              </span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto flex-col space-y-2 p-4 hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/20"
          >
            <Link href="/dashboard/settings/social">
              <Users className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium">{translations?.buttons.connectAccounts || "Connect Accounts"}</span>
              <span className="text-muted-foreground text-xs">
                {translations?.descriptions.connectAccountsDesc || "Social platforms"}
              </span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto flex-col space-y-2 p-4 hover:border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/20"
          >
            <Link href="/dashboard/analytics">
              <BarChart3 className="h-6 w-6 text-orange-600" />
              <span className="text-sm font-medium">{translations?.buttons.viewAnalytics || "View Analytics"}</span>
              <span className="text-muted-foreground text-xs">
                {translations?.descriptions.viewAnalyticsDesc || "Performance insights"}
              </span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
        <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 w-full bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
