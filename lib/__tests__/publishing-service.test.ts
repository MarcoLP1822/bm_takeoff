import { PublishingService } from "../publishing-service"
import { SocialMediaService } from "../social-media"
import { db } from "@/db"
import { generatedContent, socialAccounts } from "@/db/schema"

// Mock dependencies
jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn()
        }))
      }))
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn()
      }))
    }))
  }
}))
jest.mock("../social-media")

const mockDb = db as jest.Mocked<typeof db>
const mockSocialMediaService = SocialMediaService as jest.Mocked<typeof SocialMediaService>

describe("PublishingService", () => {
  let mockDbSelect: jest.Mock
  let mockDbUpdate: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup fresh mocks for each test
    mockDbSelect = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn()
        }))
      }))
    }))

    mockDbUpdate = jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn()
      }))
    }))

    // Override the mocked db methods
    mockDb.select = mockDbSelect
    mockDb.update = mockDbUpdate
  })

  describe("publishNow", () => {
    const mockUserId = "user-123"
    const mockContentId = "content-123"
    const mockAccountId = "account-123"

    const mockContent = {
      id: mockContentId,
      userId: mockUserId,
      platform: "twitter",
      content: "Test post content",
      hashtags: ["#test", "#book"],
      imageUrl: null
    }

    const mockAccount = {
      id: mockAccountId,
      userId: mockUserId,
      platform: "twitter",
      accountId: "twitter-123",
      accountName: "Test Account",
      isActive: true
    }

    beforeEach(() => {
      // Mock database queries
      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockContent])
          })
        })
      })

      // Mock social media service
      mockSocialMediaService.getValidAccessToken.mockResolvedValue("valid-token")
    })

    it("should publish content successfully", async () => {
      // Mock successful Twitter API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: "tweet-123" } })
      })

      // Mock account query
      mockDbSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockContent])
          })
        })
      })

      mockDbSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockAccount])
          })
        })
      })

      // Mock update query
      mockDbUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      })

      const results = await PublishingService.publishNow(mockUserId, {
        contentId: mockContentId,
        accountIds: [mockAccountId]
      })

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        success: true,
        contentId: mockContentId,
        accountId: mockAccountId,
        platform: "twitter",
        socialPostId: "tweet-123"
      })

      expect(fetch).toHaveBeenCalledWith("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Authorization": "Bearer valid-token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: "Test post content\n\n#test #book"
        })
      })
    })

    it("should handle publishing failures", async () => {
      // Mock failed Twitter API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("API Error")
      })

      mockDbSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockContent])
          })
        })
      })

      mockDbSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockAccount])
          })
        })
      })

      const results = await PublishingService.publishNow(mockUserId, {
        contentId: mockContentId,
        accountIds: [mockAccountId]
      })

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        success: false,
        contentId: mockContentId,
        accountId: mockAccountId,
        platform: "twitter",
        error: "Twitter publish failed: API Error"
      })
    })

    it("should handle content not found", async () => {
      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]) // No content found
          })
        })
      })

      await expect(
        PublishingService.publishNow(mockUserId, {
          contentId: mockContentId,
          accountIds: [mockAccountId]
        })
      ).rejects.toThrow("Content not found")
    })

    it("should handle inactive social account", async () => {
      const inactiveAccount = { ...mockAccount, isActive: false }

      mockDbSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockContent])
          })
        })
      })

      mockDbSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]) // No active account
          })
        })
      })

      const results = await PublishingService.publishNow(mockUserId, {
        contentId: mockContentId,
        accountIds: [mockAccountId]
      })

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].error).toBe("Social account not found or inactive")
    })
  })

  describe("retryPublication", () => {
    const mockUserId = "user-123"
    const mockContentId = "content-123"
    const mockAccountId = "account-123"

    const mockContent = {
      id: mockContentId,
      userId: mockUserId,
      platform: "twitter",
      content: "Test post content",
      hashtags: ["#test"],
      imageUrl: null
    }

    it("should retry publication successfully", async () => {
      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockContent])
          })
        })
      })

      // Mock successful retry (reuse publishToAccount logic)
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: "tweet-retry-123" } })
      })

      mockSocialMediaService.getValidAccessToken.mockResolvedValue("valid-token")

      const mockAccount = {
        id: mockAccountId,
        userId: mockUserId,
        platform: "twitter",
        isActive: true
      }

      mockDbSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockContent])
          })
        })
      })

      mockDbSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockAccount])
          })
        })
      })

      mockDbUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      })

      const result = await PublishingService.retryPublication(
        mockUserId,
        mockContentId,
        mockAccountId
      )

      expect(result.success).toBe(true)
      expect(result.socialPostId).toBe("tweet-retry-123")
    })

    it("should handle retry failure and update content status", async () => {
      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockContent])
          })
        })
      })

      // Mock failed retry
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("Retry failed")
      })

      mockSocialMediaService.getValidAccessToken.mockResolvedValue("valid-token")

      const mockAccount = {
        id: mockAccountId,
        userId: mockUserId,
        platform: "twitter",
        isActive: true
      }

      mockDbSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockContent])
          })
        })
      })

      mockDbSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockAccount])
          })
        })
      })

      mockDbUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      })

      await expect(
        PublishingService.retryPublication(mockUserId, mockContentId, mockAccountId)
      ).rejects.toThrow("Twitter publish failed: Retry failed")

      // Verify content status was updated to failed
      expect(mockDbUpdate).toHaveBeenCalledWith(generatedContent)
    })
  })
})
