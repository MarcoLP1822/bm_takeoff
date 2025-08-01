import { GET } from "../route"

// Mock NextRequest to avoid edge runtime issues in tests
jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url: string) => {
    const urlObj = new URL(url)
    return {
      url,
      nextUrl: urlObj,
      method: "GET",
      headers: new Headers(),
      cookies: new Map()
    }
  }),
  NextResponse: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: jest.fn().mockImplementation((data: any, init?: ResponseInit) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Map()
    }))
  }
}))

// Import the mocked NextRequest
import { NextRequest } from "next/server"

// Mock dependencies
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn()
}))

jest.mock("@/lib/analytics-service", () => ({
  AnalyticsService: {
    getPostPerformance: jest.fn()
  }
}))

jest.mock("@/lib/cache-service", () => ({
  getCachedAnalyticsData: jest.fn(),
  cacheAnalyticsData: jest.fn()
}))

jest.mock("@/lib/database-optimization", () => ({
  getOptimizedAnalytics: jest.fn()
}))

// Import mocked modules with proper typing
import { auth } from "@clerk/nextjs/server"
import { AnalyticsService } from "@/lib/analytics-service"
import { getCachedAnalyticsData, cacheAnalyticsData } from "@/lib/cache-service"

// Type the mocked functions
const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockGetPostPerformance =
  AnalyticsService.getPostPerformance as jest.MockedFunction<
    typeof AnalyticsService.getPostPerformance
  >
const mockGetCachedAnalyticsData =
  getCachedAnalyticsData as jest.MockedFunction<typeof getCachedAnalyticsData>
const mockCacheAnalyticsData = cacheAnalyticsData as jest.MockedFunction<
  typeof cacheAnalyticsData
>

describe("/api/analytics/posts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return post analytics for authenticated user", async () => {
    const mockPosts = [
      {
        contentId: "content-1",
        platform: "twitter" as const,
        postId: "tweet-1",
        content: "Test content",
        publishedAt: new Date("2024-01-15T10:00:00Z"),
        analytics: {
          impressions: 1000,
          likes: 50,
          shares: 10,
          comments: 5,
          clicks: 20,
          engagementRate: 6.5
        },
        bookTitle: "Test Book"
      }
    ]

    const mockResult = {
      posts: mockPosts,
      pagination: {
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false
      },
      filters: {
        platforms: ["twitter" as const],
        books: []
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ userId: "user-123" } as any)
    mockGetCachedAnalyticsData.mockResolvedValue(null)
    mockGetPostPerformance.mockResolvedValue(mockResult)

    const request = new NextRequest(
      "http://localhost/api/analytics/posts?limit=10&platform=twitter"
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockPosts)
    expect(mockGetPostPerformance).toHaveBeenCalledWith("user-123", {
      limit: 10,
      offset: 0,
      platform: "twitter",
      bookId: undefined,
      search: undefined,
      sortBy: "publishedAt",
      sortOrder: "desc",
      minEngagementRate: undefined,
      maxEngagementRate: undefined,
      startDate: undefined,
      endDate: undefined
    })
  })

  it("should return 401 for unauthenticated user", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ userId: null } as any)

    const request = new NextRequest("http://localhost/api/analytics/posts")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("should handle query parameters correctly", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ userId: "user-123" } as any)
    mockGetCachedAnalyticsData.mockResolvedValue(null)

    const mockResult = {
      posts: [],
      pagination: {
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false
      },
      filters: {
        platforms: [],
        books: []
      }
    }

    mockGetPostPerformance.mockResolvedValue(mockResult)

    const request = new NextRequest(
      "http://localhost/api/analytics/posts?limit=20&platform=instagram&bookId=book-123&startDate=2024-01-01&endDate=2024-01-31"
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockGetPostPerformance).toHaveBeenCalledWith("user-123", {
      limit: 20,
      offset: 0,
      platform: "instagram",
      bookId: "book-123",
      search: undefined,
      sortBy: "publishedAt",
      sortOrder: "desc",
      minEngagementRate: undefined,
      maxEngagementRate: undefined,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31")
    })
  })

  it("should return 400 for invalid query parameters", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ userId: "user-123" } as any)

    const request = new NextRequest(
      "http://localhost/api/analytics/posts?platform=invalid&limit=abc"
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Invalid query parameters")
  })

  it("should handle service errors", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ userId: "user-123" } as any)
    mockGetPostPerformance.mockRejectedValue(new Error("Database error"))

    const request = new NextRequest("http://localhost/api/analytics/posts")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to fetch post analytics")
  })
})
