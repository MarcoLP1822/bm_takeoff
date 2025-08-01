/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { POST } from "../route"
import { PublishingService } from "@/lib/publishing-service"
import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"

// Mock dependencies
jest.mock("@/lib/publishing-service")
jest.mock("@clerk/nextjs/server")

const mockPublishingService = PublishingService as jest.Mocked<
  typeof PublishingService
>
const mockAuth = auth as jest.MockedFunction<typeof auth>

// Type the POST function correctly - using unknown first to avoid type assertion error
const postHandler = POST as unknown as (
  request: NextRequest
) => Promise<NextResponse>

describe("/api/social/publish", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("POST", () => {
    const mockUserId = "user-123"

    const mockRequest = (body: Record<string, unknown>) =>
      new NextRequest("http://localhost/api/social/publish", {
        method: "POST",
        headers: new Headers({
          "content-type": "application/json"
        }),
        body: JSON.stringify(body)
      })

    beforeEach(() => {
      mockAuth.mockResolvedValue({ userId: mockUserId } as any)
    })

    it("should publish content successfully", async () => {
      const requestBody = {
        contentId: "content-123",
        accountIds: ["account-1", "account-2"]
      }

      const mockResults = [
        {
          success: true,
          contentId: "content-123",
          accountId: "account-1",
          platform: "twitter" as const,
          socialPostId: "tweet-123"
        },
        {
          success: true,
          contentId: "content-123",
          accountId: "account-2",
          platform: "twitter" as const,
          socialPostId: "tweet-456"
        }
      ]

      mockPublishingService.publishNow.mockResolvedValue(mockResults)

      const response = await postHandler(mockRequest(requestBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        results: mockResults,
        summary: {
          total: 2,
          successful: 2,
          failed: 0
        }
      })

      expect(mockPublishingService.publishNow).toHaveBeenCalledWith(
        mockUserId,
        requestBody
      )
    })

    it("should handle partial failures", async () => {
      const requestBody = {
        contentId: "content-123",
        accountIds: ["account-1", "account-2"]
      }

      const mockResults = [
        {
          success: true,
          contentId: "content-123",
          accountId: "account-1",
          platform: "twitter" as const,
          socialPostId: "tweet-123"
        },
        {
          success: false,
          contentId: "content-123",
          accountId: "account-2",
          platform: "twitter" as const,
          error: "API rate limit exceeded"
        }
      ]

      mockPublishingService.publishNow.mockResolvedValue(mockResults)

      const response = await postHandler(mockRequest(requestBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true, // Still success because at least one succeeded
        results: mockResults,
        summary: {
          total: 2,
          successful: 1,
          failed: 1
        }
      })
    })

    it("should handle complete failures", async () => {
      const requestBody = {
        contentId: "content-123",
        accountIds: ["account-1"]
      }

      const mockResults = [
        {
          success: false,
          contentId: "content-123",
          accountId: "account-1",
          platform: "twitter" as const,
          error: "Account not found"
        }
      ]

      mockPublishingService.publishNow.mockResolvedValue(mockResults)

      const response = await postHandler(mockRequest(requestBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: false,
        results: mockResults,
        summary: {
          total: 1,
          successful: 0,
          failed: 1
        }
      })
    })

    it("should handle unauthorized requests", async () => {
      mockAuth.mockResolvedValue({ userId: null } as any)

      const response = await postHandler(mockRequest({}))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: "Unauthorized" })
    })

    it("should validate request data", async () => {
      const invalidRequestBody = {
        contentId: "invalid-uuid",
        accountIds: [] // Empty array should fail validation
      }

      const response = await postHandler(mockRequest(invalidRequestBody))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request data")
      expect(data.details).toBeDefined()
    })

    it("should handle service errors", async () => {
      const requestBody = {
        contentId: "content-123",
        accountIds: ["account-1"]
      }

      mockPublishingService.publishNow.mockRejectedValue(
        new Error("Service unavailable")
      )

      const response = await postHandler(mockRequest(requestBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: "Failed to publish content" })
    })

    it("should require valid UUID for contentId", async () => {
      const requestBody = {
        contentId: "not-a-uuid",
        accountIds: ["550e8400-e29b-41d4-a716-446655440000"]
      }

      const response = await postHandler(mockRequest(requestBody))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request data")
    })

    it("should require at least one account", async () => {
      const requestBody = {
        contentId: "550e8400-e29b-41d4-a716-446655440000",
        accountIds: []
      }

      const response = await postHandler(mockRequest(requestBody))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request data")
    })
  })
})
