/**
 * DashboardStatsCards Component
 * Extracted from DashboardOverview for better modularity
 */
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BookOpen, 
  Edit3, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Zap, 
  Upload, 
  Activity 
} from "lucide-react"

interface QuickStats {
  booksAnalyzedToday: number
  contentGeneratedToday: number
  postsPublishedToday: number
  avgEngagementThisWeek: number
}

interface DashboardStatsCardsProps {
  totalBooks: number
  generatedContent: number
  scheduledPosts: number
  totalEngagement: number
  quickStats: QuickStats
  loading?: boolean
  translations: {
    stats: {
      totalBooks: string
      totalContent: string
      socialPosts: string
      engagement: string
    }
    descriptions: {
      booksInLibrary: string
      socialMediaPosts: string
      postsReadyToPublish: string
      likesSharesComments: string
      noDataThisWeek: string
      generatedToday: string
    }
  }
}

export default function DashboardStatsCards({ 
  totalBooks, 
  generatedContent, 
  scheduledPosts, 
  totalEngagement,
  quickStats,
  loading = false, 
  translations 
}: DashboardStatsCardsProps) {
  if (loading) {
    return <DashboardStatsCardsSkeleton />
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{translations.stats.totalBooks}</CardTitle>
          <BookOpen className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalBooks || 0}</div>
          <p className="text-muted-foreground text-xs">
            {translations.descriptions.booksInLibrary}
          </p>
          {quickStats.booksAnalyzedToday > 0 && (
            <div className="mt-2 flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />+
              {quickStats.booksAnalyzedToday} analyzed today
            </div>
          )}
        </CardContent>
        <div className="absolute top-0 right-0 h-16 w-16 rounded-bl-full bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
      </Card>

      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {translations.stats.totalContent}
          </CardTitle>
          <Edit3 className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {generatedContent || 0}
          </div>
          <p className="text-muted-foreground text-xs">
            {translations.descriptions.socialMediaPosts}
          </p>
          {quickStats.contentGeneratedToday > 0 && (
            <div className="mt-2 flex items-center text-xs text-green-600">
              <Zap className="mr-1 h-3 w-3" />+
              {quickStats.contentGeneratedToday} {translations.descriptions.generatedToday}
            </div>
          )}
        </CardContent>
        <div className="absolute top-0 right-0 h-16 w-16 rounded-bl-full bg-gradient-to-br from-green-500/10 to-blue-500/10" />
      </Card>

      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {translations.stats.socialPosts}
          </CardTitle>
          <Calendar className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {scheduledPosts || 0}
          </div>
          <p className="text-muted-foreground text-xs">
            {translations.descriptions.postsReadyToPublish}
          </p>
          {quickStats.postsPublishedToday > 0 && (
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <Upload className="mr-1 h-3 w-3" />
              {quickStats.postsPublishedToday} published today
            </div>
          )}
        </CardContent>
        <div className="absolute top-0 right-0 h-16 w-16 rounded-bl-full bg-gradient-to-br from-orange-500/10 to-red-500/10" />
      </Card>

      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {translations.stats.engagement}
          </CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalEngagement || 0}
          </div>
          <p className="text-muted-foreground text-xs">
            {translations.descriptions.likesSharesComments}
          </p>
          <div className="mt-2 flex items-center text-xs">
            {quickStats.avgEngagementThisWeek > 0 ? (
              <div className="flex items-center text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                {quickStats.avgEngagementThisWeek.toFixed(1)}% avg this week
              </div>
            ) : (
              <div className="text-muted-foreground flex items-center">
                <Activity className="mr-1 h-3 w-3" />
                {translations.descriptions.noDataThisWeek}
              </div>
            )}
          </div>
        </CardContent>
        <div className="absolute top-0 right-0 h-16 w-16 rounded-bl-full bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
      </Card>
    </div>
  )
}

function DashboardStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-4 bg-gray-200 animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="mb-2 h-8 w-16 bg-gray-200 animate-pulse rounded" />
            <div className="h-3 w-32 bg-gray-200 animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
