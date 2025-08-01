import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { AnalyticsDashboard } from "../analytics-dashboard"

// Mock fetch
global.fetch = jest.fn()

describe("AnalyticsDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful API responses
    const mockResponses = {
      "/api/analytics/insights": {
        success: true,
        data: {
          totalPosts: 25,
          totalEngagement: 1250,
          avgEngagementRate: 6.8,
          bestPerformingPlatform: "twitter",
          topThemes: [],
          optimalPostingTimes: [],
          recentTrends: {
            period: "Last 30 days",
            engagementChange: 15.2,
            impressionsChange: 8.7
          }
        }
      },
      "/api/analytics/posts?limit=20": {
        success: true,
        data: [
          {
            contentId: "content-1",
            platform: "twitter",
            postId: "tweet-1",
            content: "Test tweet content",
            publishedAt: "2024-01-15T10:00:00Z",
            analytics: {
              impressions: 1000,
              likes: 50,
              shares: 10,
              comments: 5,
              clicks: 20,
              engagementRate: 6.5
            },
            bookTitle: "Test Book",
            themes: ["technology", "innovation"]
          }
        ]
      },
      "/api/analytics/platforms": {
        success: true,
        data: [
          {
            platform: "twitter",
            totalPosts: 15,
            avgEngagementRate: 7.2,
            totalImpressions: 15000,
            totalLikes: 750,
            totalShares: 150,
            totalComments: 75
          }
        ]
      },
      "/api/analytics/themes": {
        success: true,
        data: [
          {
            theme: "technology",
            postCount: 10,
            avgEngagementRate: 7.5,
            totalEngagement: 750,
            platforms: [
              { platform: "twitter", avgEngagementRate: 8.0, postCount: 6 }
            ]
          }
        ]
      },
      "/api/analytics/optimal-times": {
        success: true,
        data: [
          {
            platform: "twitter",
            dayOfWeek: 1,
            hour: 10,
            avgEngagementRate: 8.5,
            postCount: 5
          }
        ]
      }
    }

    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      const response = mockResponses[url as keyof typeof mockResponses]
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response)
      })
    })
  })

  it("should render loading state initially", () => {
    render(<AnalyticsDashboard />)

    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument()
    // Should show loading skeleton cards
    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(4)
  })

  it("should render analytics data after loading", async () => {
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText("25")).toBeInTheDocument() // Total posts
      expect(screen.getByText("1.3K")).toBeInTheDocument() // Total engagement (formatted)
      expect(screen.getByText("6.8%")).toBeInTheDocument() // Avg engagement rate
      expect(screen.getByText("twitter")).toBeInTheDocument() // Best platform
    })
  })

  it("should display recent trends", async () => {
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Recent Trends")).toBeInTheDocument()
      expect(screen.getByText("Last 30 days")).toBeInTheDocument()
      expect(screen.getByText("+15.2%")).toBeInTheDocument() // Engagement change
      expect(screen.getByText("+8.7%")).toBeInTheDocument() // Impressions change
    })
  })

  it("should switch between tabs", async () => {
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Platform Performance")).toBeInTheDocument()
    })

    // Click on Theme Analysis tab
    fireEvent.click(screen.getByText("Theme Analysis"))

    await waitFor(() => {
      expect(screen.getByText("#1 technology")).toBeInTheDocument()
      expect(screen.getByText("10 posts")).toBeInTheDocument()
    })

    // Click on Optimal Times tab
    fireEvent.click(screen.getByText("Optimal Times"))

    await waitFor(() => {
      expect(screen.getByText("Best Posting Times")).toBeInTheDocument()
      expect(screen.getByText("Monday at 10:00 AM")).toBeInTheDocument()
    })

    // Click on Recent Posts tab
    fireEvent.click(screen.getByText("Recent Posts"))

    await waitFor(() => {
      expect(screen.getByText("Test Book")).toBeInTheDocument()
      expect(screen.getByText("Test tweet content")).toBeInTheDocument()
    })
  })

  it("should handle update analytics button", async () => {
    ;(fetch as jest.Mock).mockImplementation(
      (url: string, options?: RequestInit) => {
        if (url === "/api/analytics/update" && options?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          })
        }

        // Return mock data for other requests
        const mockResponses = {
          "/api/analytics/insights": {
            success: true,
            data: { totalPosts: 26 }
          },
          "/api/analytics/posts?limit=20": { success: true, data: [] },
          "/api/analytics/platforms": { success: true, data: [] },
          "/api/analytics/themes": { success: true, data: [] },
          "/api/analytics/optimal-times": { success: true, data: [] }
        }

        const response = mockResponses[url as keyof typeof mockResponses] || {
          success: true,
          data: []
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response)
        })
      }
    )

    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Update Analytics")).toBeInTheDocument()
    })

    const updateButton = screen.getByText("Update Analytics")
    fireEvent.click(updateButton)

    await waitFor(() => {
      expect(screen.getByText("Updating...")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText("Update Analytics")).toBeInTheDocument()
    })

    expect(fetch).toHaveBeenCalledWith("/api/analytics/update", {
      method: "POST"
    })
  })

  it("should format numbers correctly", async () => {
    // Mock response with large numbers
    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/analytics/insights") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                totalPosts: 1500000,
                totalEngagement: 2500000,
                avgEngagementRate: 6.8,
                bestPerformingPlatform: "twitter",
                topThemes: [],
                optimalPostingTimes: [],
                recentTrends: {
                  period: "Last 30 days",
                  engagementChange: 15.2,
                  impressionsChange: 8.7
                }
              }
            })
        })
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })
    })

    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText("1.5M")).toBeInTheDocument() // Total posts formatted
      expect(screen.getByText("2.5M")).toBeInTheDocument() // Total engagement formatted
    })
  })

  it("should handle API errors gracefully", async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error("API Error"))

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load analytics data:",
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })
})
