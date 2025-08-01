/* eslint-disable @typescript-eslint/no-explicit-any */
import { GET } from "../route"
import { auth } from "@clerk/nextjs/server"
import { SocialMediaService } from "@/lib/social-media"

// Mock dependencies
jest.mock("@clerk/nextjs/server")
jest.mock("@/lib/social-media")

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockSocialMediaService = SocialMediaService as jest.Mocked<
  typeof SocialMediaService
>

describe("/api/social/accounts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET", () => {
    it("should return user's social accounts", async () => {
      const mockAccounts = [
        {
          id: "1",
          platform: "twitter" as const,
          accountId: "123456789",
          accountName: "Test User",
          accountHandle: "testuser",
          isActive: true,
          tokenExpiresAt: new Date(Date.now() + 3600000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockAuth.mockResolvedValue({ userId: "user123" } as any)
      mockSocialMediaService.getUserAccounts.mockResolvedValue(mockAccounts)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.accounts).toEqual(mockAccounts)
      expect(mockSocialMediaService.getUserAccounts).toHaveBeenCalledWith(
        "user123"
      )
    })

    it("should return 401 for unauthenticated user", async () => {
      mockAuth.mockResolvedValue({ userId: null } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })

    it("should handle service errors", async () => {
      mockAuth.mockResolvedValue({ userId: "user123" } as any)
      mockSocialMediaService.getUserAccounts.mockRejectedValue(
        new Error("Database error")
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("Failed to fetch social accounts")
    })
  })
})
