/**
 * RecentContent Component
 * Extracted from DashboardOverview for better modularity
 */
"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Zap, ArrowRight, Heart, Share2, MessageCircle } from "lucide-react"

interface RecentContentItem {
  id: string
  platform: string
  content: string
  status: "draft" | "scheduled" | "published"
  scheduledAt?: string
  engagement?: {
    likes: number
    shares: number
    comments: number
  }
}

interface RecentContentProps {
  content: RecentContentItem[]
  loading?: boolean
  translations: {
    sections: {
      recentContent: string
    }
    descriptions: {
      recentContentDesc: string
      noContentYet: string
      generateFirstContent: string
    }
    buttons: {
      generateContent: string
    }
  }
}

export default function RecentContent({ content, loading = false, translations }: RecentContentProps) {
  if (loading) {
    return <RecentContentSkeleton />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{translations.sections.recentContent}</CardTitle>
          <CardDescription>
            {translations.descriptions.recentContentDesc}
          </CardDescription>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/content/generate">
            <Zap className="mr-2 h-4 w-4" />
            {translations.buttons.generateContent}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {content && content.length > 0 ? (
          <div className="space-y-4">
            {content.map(contentItem => (
              <div
                key={contentItem.id}
                className="bg-card space-y-3 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {contentItem.platform}
                  </Badge>
                  <Badge
                    variant={
                      contentItem.status === "published"
                        ? "default"
                        : contentItem.status === "scheduled"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {contentItem.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                  {contentItem.content}
                </p>
                {contentItem.status === "published" && contentItem.engagement && (
                  <div className="text-muted-foreground flex items-center justify-between border-t pt-2 text-xs sm:justify-start sm:space-x-4">
                    <div className="flex items-center">
                      <Heart className="mr-1 h-3 w-3" />
                      {contentItem.engagement.likes}
                    </div>
                    <div className="flex items-center">
                      <Share2 className="mr-1 h-3 w-3" />
                      {contentItem.engagement.shares}
                    </div>
                    <div className="flex items-center">
                      <MessageCircle className="mr-1 h-3 w-3" />
                      {contentItem.engagement.comments}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Button asChild variant="ghost" className="w-full">
              <Link href="/dashboard/content">
                View All Content
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center">
            <FileText className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-2 text-sm font-semibold">{translations.descriptions.noContentYet}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {translations.descriptions.generateFirstContent}
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/content/generate">
                <Zap className="mr-2 h-4 w-4" />
                {translations.buttons.generateContent}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentContentSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="h-9 w-24 bg-gray-200 animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-16 bg-gray-200 animate-pulse rounded" />
                <div className="h-5 w-20 bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
