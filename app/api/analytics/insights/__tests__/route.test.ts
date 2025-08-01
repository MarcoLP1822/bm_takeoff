import { GET } from "../route"
import { auth } from "@clerk/nextjs/server"
import { AnalyticsService } from "@/lib/analytics-service"

// Mock dependencies
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn()
}))

jest.mock("@/lib/analytics-service", () => ({
  AnalyticsService: {
    getAnalyticsInsights: jest.fn()
  }
}))

// Type the mocked functions
const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockGetAnalyticsInsights =
  AnalyticsService.getAnalyticsInsights as jest.MockedFunction<
    typeof AnalyticsService.getAnalyticsInsights
  >

describe("/api/analytics/insights", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return analytics insights for authenticated user", async () => {
    const mockInsights = {
      totalPosts: 25,
      totalEngagement: 1250,
      avgEngagementRate: 6.8,
      bestPerformingPlatform: "twitter" as const,
      topThemes: [
        {
          theme: "technology",
          postCount: 10,
          avgEngagementRate: 7.5,
          totalEngagement: 750,
          platforms: [
            {
              platform: "twitter" as const,
              avgEngagementRate: 8.0,
              postCount: 6
            },
            {
              platform: "linkedin" as const,
              avgEngagementRate: 7.0,
              postCount: 4
            }
          ]
        }
      ],
      optimalPostingTimes: [
        {
          platform: "twitter" as const,
          dayOfWeek: 1,
          hour: 10,
          avgEngagementRate: 8.5,
          postCount: 5
        }
      ],
      recentTrends: {
        period: "Last 30 days",
        engagementChange: 15.2,
        impressionsChange: 8.7
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ userId: "user-123" } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetAnalyticsInsights.mockResolvedValue(mockInsights as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockInsights)
    expect(mockGetAnalyticsInsights).toHaveBeenCalledWith("user-123")
  })

  it("should return 401 for unauthenticated user", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ userId: null } as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("should handle service errors", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ userId: "user-123" } as any)
    mockGetAnalyticsInsights.mockRejectedValue(new Error("Database error"))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to fetch analytics insights")
  })
})
