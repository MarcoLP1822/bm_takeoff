/**
 * Custom hook for managing dashboard statistics and data fetching
 * Extracted from DashboardOverview to improve modularity and reusability
 */
"use client"

import { useState, useEffect, useCallback } from "react"

export interface DashboardStats {
  totalBooks: number
  generatedContent: number
  scheduledPosts: number
  totalEngagement: number
  recentBooks: Array<{
    id: string
    title: string
    author: string
    status: "analyzing" | "completed" | "error"
    progress?: number
    createdAt: string
  }>
  recentContent: Array<{
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
  }>
  analytics: {
    weeklyEngagement: number
    topPerformingPlatform: string
    avgEngagementRate: number
  }
}

interface QuickStats {
  booksAnalyzedToday: number
  contentGeneratedToday: number
  postsPublishedToday: number
  avgEngagementThisWeek: number
}

interface UseDashboardStatsReturn {
  stats: DashboardStats | null
  quickStats: QuickStats
  loading: boolean
  error: string | null
  refreshing: boolean
  isFirstTime: boolean
  refreshData: () => Promise<void>
}

// Type definitions for API responses
interface BookResponse {
  id: string
  title: string
  author?: string
  analysisStatus?: string
  createdAt: string
}

interface ContentResponse {
  id: string
  platform: string
  content: string
  status: string
  scheduledAt?: string
}

interface AnalyticsResponse {
  totalEngagement?: number
  weeklyEngagement?: number
  topPerformingPlatform?: string
  avgEngagementRate?: number
}

// API response wrappers from our unified API format (Phase 2.1)
interface BooksApiResponse {
  success: boolean
  data?: {
    books: BookResponse[]
  }
  books?: BookResponse[] // Legacy format
}

interface ContentApiResponse {
  success: boolean
  data?: {
    content: ContentResponse[]
  }
  content?: ContentResponse[] // Legacy format
}

interface AnalyticsApiResponse extends AnalyticsResponse {
  success?: boolean
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [quickStats, setQuickStats] = useState<QuickStats>({
    booksAnalyzedToday: 0,
    contentGeneratedToday: 0,
    postsPublishedToday: 0,
    avgEngagementThisWeek: 0
  })

  const processApiResponse = useCallback((
    books: BooksApiResponse | BookResponse[], 
    content: ContentApiResponse | ContentResponse[], 
    analytics: AnalyticsApiResponse
  ) => {
    // Extract the actual data arrays from the API responses with safety checks
    const booksData = Array.isArray(books) 
      ? books 
      : Array.isArray((books as BooksApiResponse).books)
        ? (books as BooksApiResponse).books!
        : Array.isArray((books as BooksApiResponse).data?.books)
          ? (books as BooksApiResponse).data!.books
          : []
    
    const contentData = Array.isArray(content)
      ? content
      : Array.isArray((content as ContentApiResponse).content)
        ? (content as ContentApiResponse).content!
        : Array.isArray((content as ContentApiResponse).data?.content)
          ? (content as ContentApiResponse).data!.content
          : []
    
    const analyticsData = analytics as AnalyticsResponse

    console.log("Debug - API responses:", {
      booksRaw: books,
      contentRaw: content,
      booksData: booksData.length,
      contentData: contentData.length
    })

    // Process and format the data
    const dashboardStats: DashboardStats = {
      totalBooks: booksData.length || 0,
      generatedContent: contentData.length || 0,
      scheduledPosts:
        contentData.filter((c: ContentResponse) => c.status === "scheduled")
          .length || 0,
      totalEngagement: analyticsData.totalEngagement || 0,
      recentBooks: booksData.slice(0, 5).map((book: BookResponse) => ({
        id: book.id,
        title: book.title,
        author: book.author || "Unknown Author",
        status:
          (book.analysisStatus as "analyzing" | "completed" | "error") ||
          "completed",
        progress: book.analysisStatus === "analyzing" ? 65 : 100,
        createdAt: book.createdAt
      })),
      recentContent: contentData
        .slice(0, 5)
        .map((item: ContentResponse) => ({
          id: item.id,
          platform: item.platform,
          content: item.content.substring(0, 100) + "...",
          status: item.status as "draft" | "scheduled" | "published",
          scheduledAt: item.scheduledAt,
          engagement: {
            likes: Math.floor(Math.random() * 100),
            shares: Math.floor(Math.random() * 50),
            comments: Math.floor(Math.random() * 25)
          }
        })),
      analytics: {
        weeklyEngagement: analyticsData.weeklyEngagement || 0,
        topPerformingPlatform:
          analyticsData.topPerformingPlatform || "Twitter",
        avgEngagementRate: analyticsData.avgEngagementRate || 0
      }
    }

    return dashboardStats
  }, [])

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null)

      // Fetch dashboard statistics using the new API pattern from Phase 2.1
      const [booksRes, contentRes, analyticsRes] = await Promise.all([
        fetch("/api/books"),
        fetch("/api/content"),
        fetch("/api/analytics/insights")
      ])

      if (!booksRes.ok || !contentRes.ok || !analyticsRes.ok) {
        throw new Error("Failed to fetch dashboard data")
      }

      const [books, content, analytics] = await Promise.all([
        booksRes.json(),
        contentRes.json(),
        analyticsRes.json()
      ])

      const dashboardStats = processApiResponse(books, content, analytics)
      setStats(dashboardStats)

      // Check if this is a first-time user (no books uploaded)
      const isNewUser =
        dashboardStats.totalBooks === 0 &&
        dashboardStats.generatedContent === 0
      setIsFirstTime(isNewUser)

      // Calculate quick stats (for today)
      const today = new Date()
      const todayBooks = dashboardStats.recentBooks.filter(book => {
        const bookDate = new Date(book.createdAt)
        return bookDate.toDateString() === today.toDateString()
      })

      setQuickStats({
        booksAnalyzedToday: todayBooks.length,
        contentGeneratedToday: Math.floor(Math.random() * 3), // Mock data
        postsPublishedToday: Math.floor(Math.random() * 2), // Mock data
        avgEngagementThisWeek: dashboardStats.analytics.avgEngagementRate
      })

    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError("Failed to load dashboard data")
      
      // Set default empty state
      setStats({
        totalBooks: 0,
        generatedContent: 0,
        scheduledPosts: 0,
        totalEngagement: 0,
        recentBooks: [],
        recentContent: [],
        analytics: {
          weeklyEngagement: 0,
          topPerformingPlatform: "Twitter",
          avgEngagementRate: 0
        }
      })
      setIsFirstTime(true)
    }
  }, [processApiResponse])

  const refreshData = useCallback(async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }, [fetchDashboardData])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchDashboardData()
      setLoading(false)
    }

    loadData()
  }, [fetchDashboardData])

  return {
    stats,
    quickStats,
    loading,
    error,
    refreshing,
    isFirstTime,
    refreshData
  }
}
