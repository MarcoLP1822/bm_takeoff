/**
 * PerformanceOverview Component
 * Extracted from DashboardOverview for better modularity
 */
"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Target, TrendingUp, BarChart3 } from "lucide-react"

interface PerformanceData {
  weeklyEngagement: number
  topPerformingPlatform: string
  avgEngagementRate: number
}

interface PerformanceOverviewProps {
  analytics: PerformanceData
  loading?: boolean
  translations: {
    sections: {
      performanceOverview: string
    }
  }
}

export default function PerformanceOverview({ analytics, loading = false, translations }: PerformanceOverviewProps) {
  if (loading) {
    return <PerformanceOverviewSkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations.sections.performanceOverview}</CardTitle>
        <CardDescription>
          Your social media performance at a glance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center">
              <Activity className="text-muted-foreground mr-2 h-4 w-4" />
              <span className="text-sm font-medium">Weekly Engagement</span>
            </div>
            <div className="text-2xl font-bold">
              {analytics.weeklyEngagement || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              Total interactions this week
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <Target className="text-muted-foreground mr-2 h-4 w-4" />
              <span className="text-sm font-medium">Top Platform</span>
            </div>
            <div className="text-2xl font-bold">
              {analytics.topPerformingPlatform || "N/A"}
            </div>
            <p className="text-muted-foreground text-xs">
              Best performing platform
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <TrendingUp className="text-muted-foreground mr-2 h-4 w-4" />
              <span className="text-sm font-medium">
                Avg. Engagement Rate
              </span>
            </div>
            <div className="text-2xl font-bold">
              {analytics.avgEngagementRate?.toFixed(1) || "0.0"}%
            </div>
            <p className="text-muted-foreground text-xs">
              Average across all posts
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button asChild>
            <Link href="/dashboard/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Detailed Analytics
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PerformanceOverviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
        <div className="h-4 w-64 bg-gray-200 animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
              <div className="h-3 w-40 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <div className="h-10 w-48 bg-gray-200 animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  )
}
