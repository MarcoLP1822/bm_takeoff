import { POST, GET } from "../route"
import { SchedulingService } from "@/lib/scheduling-service"
import { auth } from "@clerk/nextjs/server"
import { NextRequest } from "next/server"
import { type ScheduledPost } from "@/lib/publishing-service"
import { type SocialPlatform } from "@/lib/social-media"

// Mock dependencies
jest.mock("@/lib/scheduling-service")
jest.mock("@clerk/nextjs/server")

const mockSchedulingService = SchedulingService as jest.Mocked<typeof SchedulingService>
const mockAuth = auth as jest.MockedFunction<typeof auth>

describe("/api/social/schedule", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUserId = "user-123"

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ userId: mockUserId } as any)
  })

  describe("POST", () => {
    const mockRequest = (body: Record<string, unknown>) => ({
      json: () => Promise.resolve(body)
    }) as NextRequest

    it("should schedule post successfully", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const requestBody = {
        contentId: "550e8400-e29b-41d4-a716-446655440000",
        accountIds: ["550e8400-e29b-41d4-a716-446655440001"],
        scheduledAt: futureDate.toISOString()
      }

      mockSchedulingService.schedulePost.mockResolvedValue()

      const response = await POST(mockRequest(requestBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: "Post scheduled successfully",
        scheduledAt: futureDate.toISOString()
      })

      expect(mockSchedulingService.schedulePost).toHaveBeenCalledWith(
        mockUserId,
        {
          contentId: requestBody.contentId,
          accountIds: requestBody.accountIds,
          scheduledAt: futureDate
        }
      )
    })

    it("should handle unauthorized requests", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockAuth.mockResolvedValue({ userId: null } as any)

      const response = await POST(mockRequest({}))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: "Unauthorized" })
    })

    it("should validate request data", async () => {
      const invalidRequestBody = {
        contentId: "invalid-uuid",
        accountIds: [],
        scheduledAt: "invalid-date"
      }

      const response = await POST(mockRequest(invalidRequestBody))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request data")
      expect(data.details).toBeDefined()
    })

    it("should handle service errors", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const requestBody = {
        contentId: "550e8400-e29b-41d4-a716-446655440000",
        accountIds: ["550e8400-e29b-41d4-a716-446655440001"],
        scheduledAt: futureDate.toISOString()
      }

      mockSchedulingService.schedulePost.mockRejectedValue(
        new Error("Scheduled time must be in the future")
      )

      const response = await POST(mockRequest(requestBody))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Scheduled time must be in the future" })
    })

    it("should handle unexpected errors", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const requestBody = {
        contentId: "550e8400-e29b-41d4-a716-446655440000",
        accountIds: ["550e8400-e29b-41d4-a716-446655440001"],
        scheduledAt: futureDate.toISOString()
      }

      mockSchedulingService.schedulePost.mockRejectedValue(
        new Error("Database connection failed")
      )

      const response = await POST(mockRequest(requestBody))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Database connection failed" })
    })

    it("should require valid datetime format", async () => {
      const requestBody = {
        contentId: "550e8400-e29b-41d4-a716-446655440000",
        accountIds: ["550e8400-e29b-41d4-a716-446655440001"],
        scheduledAt: "2024-01-01" // Missing time component
      }

      const response = await POST(mockRequest(requestBody))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request data")
    })
  })

  describe("GET", () => {
    const mockRequest = {} as NextRequest

    it("should return scheduled posts successfully", async () => {
      const mockScheduledPosts: ScheduledPost[] = [
        {
          id: "post-1",
          contentId: "content-1",
          accountId: "account-1",
          platform: "twitter" as SocialPlatform,
          content: "Test post 1",
          scheduledAt: new Date(),
          status: "scheduled" as const,
          retryCount: 0
        },
        {
          id: "post-2",
          contentId: "content-2",
          accountId: "account-2",
          platform: "instagram" as SocialPlatform,
          content: "Test post 2",
          scheduledAt: new Date(),
          status: "scheduled" as const,
          retryCount: 0
        }
      ]

      mockSchedulingService.getScheduledPosts.mockResolvedValue(mockScheduledPosts)

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        scheduledPosts: mockScheduledPosts
      })

      expect(mockSchedulingService.getScheduledPosts).toHaveBeenCalledWith(mockUserId)
    })

    it("should handle unauthorized requests", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockAuth.mockResolvedValue({ userId: null } as any)

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: "Unauthorized" })
    })

    it("should handle service errors", async () => {
      mockSchedulingService.getScheduledPosts.mockRejectedValue(
        new Error("Redis connection failed")
      )

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to get scheduled posts" })
    })

    it("should return empty array when no posts scheduled", async () => {
      mockSchedulingService.getScheduledPosts.mockResolvedValue([])

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        scheduledPosts: []
      })
    })
  })
})