import { DELETE, PUT } from "../route"
import { SchedulingService } from "@/lib/scheduling-service"
import { auth } from "@clerk/nextjs/server"
import { NextRequest } from "next/server"

// Mock dependencies
jest.mock("@/lib/scheduling-service")
jest.mock("@clerk/nextjs/server")

const mockSchedulingService = SchedulingService as jest.Mocked<
  typeof SchedulingService
>
const mockAuth = auth as jest.MockedFunction<typeof auth>

describe("/api/social/schedule/[postId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUserId = "user-123"
  const mockPostId = "post-123"
  const mockParams = { params: Promise.resolve({ postId: mockPostId }) }

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValue({ userId: mockUserId } as any)
  })

  describe("DELETE", () => {
    const mockRequest = {} as NextRequest

    it("should cancel scheduled post successfully", async () => {
      mockSchedulingService.cancelScheduledPost.mockResolvedValue()

      const response = await DELETE(mockRequest, mockParams)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: "Scheduled post cancelled successfully"
      })

      expect(mockSchedulingService.cancelScheduledPost).toHaveBeenCalledWith(
        mockUserId,
        mockPostId
      )
    })

    it("should handle unauthorized requests", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockAuth.mockResolvedValue({ userId: null } as any)

      const response = await DELETE(mockRequest, mockParams)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: "Unauthorized" })
    })

    it("should handle post not found", async () => {
      mockSchedulingService.cancelScheduledPost.mockRejectedValue(
        new Error("Scheduled post not found")
      )

      const response = await DELETE(mockRequest, mockParams)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Scheduled post not found" })
    })

    it("should handle unauthorized cancellation", async () => {
      mockSchedulingService.cancelScheduledPost.mockRejectedValue(
        new Error("Unauthorized to cancel this post")
      )

      const response = await DELETE(mockRequest, mockParams)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Unauthorized to cancel this post" })
    })

    it("should handle unexpected errors", async () => {
      mockSchedulingService.cancelScheduledPost.mockRejectedValue(
        new Error("Redis connection failed")
      )

      const response = await DELETE(mockRequest, mockParams)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to cancel scheduled post" })
    })
  })

  describe("PUT", () => {
    const mockRequest = (body: Record<string, unknown>) =>
      ({
        json: () => Promise.resolve(body)
      }) as NextRequest

    it("should reschedule post successfully", async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const requestBody = {
        scheduledAt: futureDate.toISOString()
      }

      mockSchedulingService.reschedulePost.mockResolvedValue()

      const response = await PUT(mockRequest(requestBody), mockParams)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: "Post rescheduled successfully",
        scheduledAt: futureDate.toISOString()
      })

      expect(mockSchedulingService.reschedulePost).toHaveBeenCalledWith(
        mockUserId,
        mockPostId,
        futureDate
      )
    })

    it("should handle unauthorized requests", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockAuth.mockResolvedValue({ userId: null } as any)

      const response = await PUT(mockRequest({}), mockParams)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: "Unauthorized" })
    })

    it("should validate request data", async () => {
      const invalidRequestBody = {
        scheduledAt: "invalid-date"
      }

      const response = await PUT(mockRequest(invalidRequestBody), mockParams)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request data")
      expect(data.details).toBeDefined()
    })

    it("should handle past scheduled time", async () => {
      const pastDate = new Date(Date.now() - 60 * 1000)
      const requestBody = {
        scheduledAt: pastDate.toISOString()
      }

      mockSchedulingService.reschedulePost.mockRejectedValue(
        new Error("New scheduled time must be in the future")
      )

      const response = await PUT(mockRequest(requestBody), mockParams)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: "New scheduled time must be in the future"
      })
    })

    it("should handle post not found", async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const requestBody = {
        scheduledAt: futureDate.toISOString()
      }

      mockSchedulingService.reschedulePost.mockRejectedValue(
        new Error("Scheduled post not found")
      )

      const response = await PUT(mockRequest(requestBody), mockParams)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Scheduled post not found" })
    })

    it("should handle unauthorized reschedule", async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const requestBody = {
        scheduledAt: futureDate.toISOString()
      }

      mockSchedulingService.reschedulePost.mockRejectedValue(
        new Error("Unauthorized to reschedule this post")
      )

      const response = await PUT(mockRequest(requestBody), mockParams)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: "Unauthorized to reschedule this post" })
    })

    it("should handle unexpected errors", async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const requestBody = {
        scheduledAt: futureDate.toISOString()
      }

      mockSchedulingService.reschedulePost.mockRejectedValue(
        new Error("Database connection failed")
      )

      const response = await PUT(mockRequest(requestBody), mockParams)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to reschedule post" })
    })

    it("should require valid datetime format", async () => {
      const requestBody = {
        scheduledAt: "2024-01-01" // Missing time component
      }

      const response = await PUT(mockRequest(requestBody), mockParams)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request data")
    })
  })
})
