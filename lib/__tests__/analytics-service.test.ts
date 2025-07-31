import { AnalyticsService } from "../analytics-service"
import type { PostPerformance, PlatformComparison, ThemePerformance, OptimalPostingTime } from "../analytics-service"

// Mock fetch
global.fetch = jest.fn()

// Mock the database
jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    selectDistinct: jest.fn()
  }
}))

// Mock the social media service
jest.mock("../social-media", () => ({
  SocialMediaService: {
    getValidAccessToken: jest.fn()
  }
}))

// Import the mocked db for type-safe usage
import { db } from "@/db"
const mockedDb = jest.mocked(db)

describe("AnalyticsService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("collectPostAnalytics", () => {
    it("should collect Twitter analytics successfully", async () => {
      const mockTwitterResponse = {
        data: {
          public_metrics: {
            impression_count: 1000,
            like_count: 50,
            retweet_count: 10,
            reply_count: 5,
            url_link_clicks: 20
          }
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTwitterResponse)
      })

      // Mock database operations
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      })

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined)
      })

      mockedDb.select.mockImplementation(mockSelect)
      mockedDb.insert.mockImplementation(mockInsert)

      const result = await AnalyticsService.collectPostAnalytics(
        "content-id",
        "twitter",
        "tweet-id",
        "access-token"
      )

      expect(result).toEqual({
        impressions: 1000,
        likes: 50,
        shares: 10,
        comments: 5,
        clicks: 20,
        engagementRate: 6.5 // (50+10+5)/1000 * 100
      })

      expect(fetch).toHaveBeenCalledWith(
        "https://api.twitter.com/2/tweets/tweet-id?tweet.fields=public_metrics",
        {
          headers: {
            "Authorization": "Bearer access-token"
          }
        }
      )
    })

    it("should collect Instagram analytics successfully", async () => {
      const mockInstagramResponse = {
        data: [
          { name: "impressions", values: [{ value: 800 }] },
          { name: "likes", values: [{ value: 40 }] },
          { name: "comments", values: [{ value: 8 }] },
          { name: "shares", values: [{ value: 5 }] },
          { name: "reach", values: [{ value: 600 }] }
        ]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInstagramResponse)
      })

      // Mock database operations
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      })

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined)
      })

      mockedDb.select.mockImplementation(mockSelect)
      mockedDb.insert.mockImplementation(mockInsert)

      const result = await AnalyticsService.collectPostAnalytics(
        "content-id",
        "instagram",
        "post-id",
        "access-token"
      )

      expect(result).toEqual({
        impressions: 800,
        likes: 40,
        shares: 5,
        comments: 8,
        clicks: 0,
        reach: 600,
        engagementRate: 6.63 // (40+5+8)/800 * 100
      })
    })

    it("should handle API errors gracefully", async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized"
      })

      await expect(
        AnalyticsService.collectPostAnalytics(
          "content-id",
          "twitter",
          "tweet-id",
          "invalid-token"
        )
      ).rejects.toThrow("Twitter analytics fetch failed: Unauthorized")
    })

    it("should update existing analytics record", async () => {
      const mockTwitterResponse = {
        data: {
          public_metrics: {
            impression_count: 1200,
            like_count: 60,
            retweet_count: 15,
            reply_count: 8,
            url_link_clicks: 25
          }
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTwitterResponse)
      })

      // Mock existing record
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: "existing-id" }])
          })
        })
      })

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      })

      mockedDb.select.mockImplementation(mockSelect)
      mockedDb.update.mockImplementation(mockUpdate)

      await AnalyticsService.collectPostAnalytics(
        "content-id",
        "twitter",
        "tweet-id",
        "access-token"
      )

      expect(mockedDb.update).toHaveBeenCalled()
    })
  })

  describe("getPostPerformance", () => {
    it("should return formatted post performance data", async () => {
      const mockDbResults = [
        {
          contentId: "content-1",
          platform: "twitter",
          postId: "tweet-1",
          content: "Test tweet content",
          publishedAt: new Date("2024-01-15T10:00:00Z"),
          impressions: 1000,
          likes: 50,
          shares: 10,
          comments: 5,
          clicks: 20,
          reach: 800,
          engagementRate: "6.50",
          bookTitle: "Test Book",
          bookAuthor: "Test Author",
          analysisData: {
            themes: ["technology", "innovation"],
            genre: "non-fiction"
          }
        }
      ]

      const mockQuery = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockDbResults)
      }

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockQuery)
      })

      mockedDb.select.mockImplementation(mockSelect)

      const result = await AnalyticsService.getPostPerformance("user-id", {
        limit: 10,
        platform: "twitter"
      })

      expect(result.posts).toHaveLength(1)
      expect(result.posts[0]).toEqual({
        contentId: "content-1",
        platform: "twitter",
        postId: "tweet-1",
        content: "Test tweet content",
        publishedAt: new Date("2024-01-15T10:00:00Z"),
        analytics: {
          impressions: 1000,
          likes: 50,
          shares: 10,
          comments: 5,
          clicks: 20,
          reach: 800,
          engagementRate: 6.5
        },
        bookTitle: "Test Book",
        bookAuthor: "Test Author",
        themes: ["technology", "innovation", "non-fiction"]
      })
    })

    it("should handle empty results", async () => {
      const mockQuery = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      }

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockQuery)
      })

      mockedDb.select.mockImplementation(mockSelect)

      const result = await AnalyticsService.getPostPerformance("user-id")

      expect(result.posts).toEqual([])
    })
  })

  describe("getPlatformComparison", () => {
    it("should return platform comparison data", async () => {
      const mockDbResults = [
        {
          platform: "twitter",
          totalPosts: "10",
          avgEngagementRate: "5.5",
          totalImpressions: "10000",
          totalLikes: "500",
          totalShares: "100",
          totalComments: "50"
        },
        {
          platform: "instagram",
          totalPosts: "8",
          avgEngagementRate: "7.2",
          totalImpressions: "8000",
          totalLikes: "600",
          totalShares: "80",
          totalComments: "40"
        }
      ]

      const mockQuery = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue(mockDbResults)
      }

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockQuery)
      })

      mockedDb.select.mockImplementation(mockSelect)

      // Mock getPostPerformance for best performing posts
      jest.spyOn(AnalyticsService, "getPostPerformance").mockResolvedValue({
        posts: [
          {
            contentId: "best-post",
            platform: "twitter",
            postId: "best-tweet",
            content: "Best performing tweet",
            publishedAt: new Date(),
            analytics: {
              impressions: 2000,
              likes: 150,
              shares: 30,
              comments: 15,
              clicks: 50,
              engagementRate: 9.75
            }
          }
        ],
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
          hasMore: false
        },
        filters: {
          platforms: [],
          books: []
        }
      })

      const result = await AnalyticsService.getPlatformComparison("user-id")

      expect(result).toHaveLength(2)
      expect(result[0].platform).toBe("instagram") // Should be sorted by engagement rate
      expect(result[0].avgEngagementRate).toBe(7.2)
      expect(result[1].platform).toBe("twitter")
      expect(result[1].avgEngagementRate).toBe(5.5)
    })
  })

  describe("getOptimalPostingTimes", () => {
    it("should calculate optimal posting times", async () => {
      const mockPosts: PostPerformance[] = [
        {
          contentId: "content-1",
          platform: "twitter",
          postId: "post-1", 
          content: "Test content",
          publishedAt: new Date("2024-01-15T10:00:00Z"), // Monday 10 AM
          analytics: { impressions: 1000, likes: 85, shares: 10, comments: 15, clicks: 0, engagementRate: 8.5 }
        },
        {
          contentId: "content-2",
          platform: "twitter",
          postId: "post-2",
          content: "Test content",
          publishedAt: new Date("2024-01-16T10:00:00Z"), // Tuesday 10 AM
          analytics: { impressions: 1000, likes: 72, shares: 8, comments: 12, clicks: 0, engagementRate: 7.2 }
        },
        {
          contentId: "content-3",
          platform: "twitter", 
          postId: "post-3",
          content: "Test content",
          publishedAt: new Date("2024-01-17T10:00:00Z"), // Wednesday 10 AM
          analytics: { impressions: 1000, likes: 91, shares: 12, comments: 18, clicks: 0, engagementRate: 9.1 }
        }
      ]

      jest.spyOn(AnalyticsService, "getPostPerformance").mockResolvedValue({
        posts: mockPosts,
        pagination: {
          total: mockPosts.length,
          limit: 50,
          offset: 0,
          hasMore: false
        },
        filters: {
          platforms: [],
          books: []
        }
      })

      const result = await AnalyticsService.getOptimalPostingTimes("user-id")

      expect(result).toHaveLength(1) // Only one time slot with 3+ posts
      expect(result[0]).toEqual({
        platform: "twitter",
        dayOfWeek: 1, // Monday
        hour: 10,
        avgEngagementRate: expect.closeTo(8.27, 1), // Average of 8.5, 7.2, 9.1
        postCount: 3
      })
    })
  })

  describe("getAnalyticsInsights", () => {
    it("should return comprehensive analytics insights", async () => {
      const mockPosts: PostPerformance[] = [
        {
          contentId: "content-1",
          platform: "twitter",
          postId: "post-1",
          content: "Test content",
          publishedAt: new Date(),
          analytics: { 
            likes: 50, 
            shares: 10, 
            comments: 5, 
            engagementRate: 6.5,
            impressions: 1000,
            clicks: 0
          }
        },
        {
          contentId: "content-2", 
          platform: "twitter",
          postId: "post-2",
          content: "Test content",
          publishedAt: new Date(),
          analytics: { 
            likes: 30, 
            shares: 8, 
            comments: 3, 
            engagementRate: 5.1,
            impressions: 800,
            clicks: 0
          }
        }
      ]

      const mockPlatformComparison: PlatformComparison[] = [
        { platform: "twitter", avgEngagementRate: 6.5, totalPosts: 2, totalImpressions: 1800, totalLikes: 80, totalShares: 18, totalComments: 8 }
      ]

      const mockThemePerformance: ThemePerformance[] = [
        { theme: "technology", avgEngagementRate: 7.2, postCount: 1, totalEngagement: 65, platforms: [] }
      ]

      const mockOptimalTimes: OptimalPostingTime[] = [
        { platform: "twitter", dayOfWeek: 1, hour: 10, avgEngagementRate: 8.0, postCount: 3 }
      ]

      const emptyResponse = {
        posts: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
        filters: { platforms: [], books: [] }
      }

      jest.spyOn(AnalyticsService, "getPostPerformance")
        .mockResolvedValueOnce({
          posts: mockPosts,
          pagination: { total: mockPosts.length, limit: 50, offset: 0, hasMore: false },
          filters: { platforms: [], books: [] }
        }) // For main insights
        .mockResolvedValueOnce(emptyResponse) // For recent posts (last 30 days)
        .mockResolvedValueOnce(emptyResponse) // For previous posts (30-60 days ago)

      jest.spyOn(AnalyticsService, "getPlatformComparison").mockResolvedValue(mockPlatformComparison)
      jest.spyOn(AnalyticsService, "getThemePerformance").mockResolvedValue(mockThemePerformance)
      jest.spyOn(AnalyticsService, "getOptimalPostingTimes").mockResolvedValue(mockOptimalTimes)

      const result = await AnalyticsService.getAnalyticsInsights("user-id")

      expect(result).toEqual({
        totalPosts: 2,
        totalEngagement: 106, // (50+10+5) + (30+8+3)
        avgEngagementRate: 5.8, // (6.5 + 5.1) / 2
        bestPerformingPlatform: "twitter",
        topThemes: mockThemePerformance,
        optimalPostingTimes: mockOptimalTimes,
        recentTrends: {
          period: "Last 30 days",
          engagementChange: 0,
          impressionsChange: 0
        }
      })
    })
  })
})