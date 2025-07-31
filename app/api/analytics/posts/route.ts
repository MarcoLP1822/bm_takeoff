import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { AnalyticsService, type PostPerformance } from "@/lib/analytics-service"
import { getOptimizedAnalytics } from "@/lib/database-optimization"
import { getCachedAnalyticsData, cacheAnalyticsData } from "@/lib/cache-service"
import { z } from "zod"

const querySchema = z.object({
  limit: z.string().nullable().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().nullable().optional().transform(val => val ? parseInt(val) : 0),
  platform: z.enum(["twitter", "instagram", "linkedin", "facebook"]).nullable().optional().transform(val => val || undefined),
  bookId: z.string().uuid().nullable().optional().transform(val => val || undefined),
  search: z.string().nullable().optional().transform(val => val || undefined),
  sortBy: z.enum(["createdAt", "publishedAt", "engagementRate", "impressions", "likes", "shares", "comments"]).nullable().optional().transform(val => val || "publishedAt"),
  sortOrder: z.enum(["asc", "desc"]).nullable().optional().transform(val => val || "desc"),
  minEngagementRate: z.string().nullable().optional().transform(val => val ? parseFloat(val) : undefined),
  maxEngagementRate: z.string().nullable().optional().transform(val => val ? parseFloat(val) : undefined),
  startDate: z.string().nullable().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().nullable().optional().transform(val => val ? new Date(val) : undefined)
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      platform: searchParams.get("platform"),
      bookId: searchParams.get("bookId"),
      search: searchParams.get("search"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      minEngagementRate: searchParams.get("minEngagementRate"),
      maxEngagementRate: searchParams.get("maxEngagementRate"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate")
    })

    // Check cache first for analytics data
    const cacheKey = `posts:${JSON.stringify(query)}`
    const cached = await getCachedAnalyticsData(userId, cacheKey)
    
    let result: {
      posts: PostPerformance[]
      pagination: {
        total: number
        limit: number
        offset: number
        hasMore: boolean
      }
      filters: {
        platforms: string[]
        books: { id: string; title: string; author?: string }[]
      }
    }
    
    if (cached) {
      result = cached as typeof result
    } else {
      result = await AnalyticsService.getPostPerformance(userId, query)
      // Cache the result
      await cacheAnalyticsData(userId, cacheKey, result)
    }

    return NextResponse.json({
      success: true,
      data: result.posts,
      pagination: result.pagination,
      filters: result.filters
    })
  } catch (error) {
    console.error("Analytics posts API error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch post analytics" },
      { status: 500 }
    )
  }
}