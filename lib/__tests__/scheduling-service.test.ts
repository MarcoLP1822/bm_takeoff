/**
 * @jest-environment node
 */

// Setup for Node environment
global.crypto = global.crypto || {
  randomUUID: jest.fn(() => "mock-uuid-123")
}

// Mock dependencies BEFORE importing the service using factory functions
jest.mock("@upstash/redis", () => {
  const mockMethods = {
    setex: jest.fn().mockResolvedValue("OK"),
    zadd: jest.fn().mockResolvedValue(1),
    zrange: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    zrem: jest.fn().mockResolvedValue(1)
  }

  return {
    Redis: jest.fn().mockImplementation(() => mockMethods),
    __mockMethods: mockMethods // Export for access in tests
  }
})

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
jest.mock("../publishing-service", () => ({
  PublishingService: {
    publishNow: jest.fn()
  }
}))

import { SchedulingService } from "../scheduling-service"
import { PublishingService } from "../publishing-service"
import { db } from "@/db"

// Get access to the mocked Redis methods
const { __mockMethods: mockRedisInstance } = jest.requireMock("@upstash/redis")

// Type the mocked modules correctly
const mockDb = db as jest.Mocked<typeof db>
const mockPublishingService = PublishingService as jest.Mocked<
  typeof PublishingService
>

describe("SchedulingService", () => {
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

    // Reset all mock functions with default return values
    mockRedisInstance.setex.mockResolvedValue("OK")
    mockRedisInstance.zadd.mockResolvedValue(1)
    mockRedisInstance.zrange.mockResolvedValue([])
    mockRedisInstance.get.mockResolvedValue(null)
    mockRedisInstance.del.mockResolvedValue(1)
    mockRedisInstance.zrem.mockResolvedValue(1)
  })

  describe("schedulePost", () => {
    const mockUserId = "user-123"
    const mockContentId = "content-123"
    const mockAccountIds = ["account-123", "account-456"]
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    const mockContent = {
      id: mockContentId,
      userId: mockUserId,
      platform: "twitter",
      content: "Test scheduled post",
      hashtags: ["#test"]
    }

    beforeEach(() => {
      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockContent])
          })
        })
      })

      mockDbUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      })
    })

    it("should schedule post successfully", async () => {
      await SchedulingService.schedulePost(mockUserId, {
        contentId: mockContentId,
        accountIds: mockAccountIds,
        scheduledAt: futureDate
      })

      // Verify Redis operations for each account
      expect(mockRedisInstance.setex).toHaveBeenCalledTimes(2)
      expect(mockRedisInstance.zadd).toHaveBeenCalledTimes(2)

      // Verify database update
      expect(mockDb.update).toHaveBeenCalled()
    })

    it("should reject past scheduled time", async () => {
      const pastDate = new Date(Date.now() - 60 * 1000) // 1 minute ago

      await expect(
        SchedulingService.schedulePost(mockUserId, {
          contentId: mockContentId,
          accountIds: mockAccountIds,
          scheduledAt: pastDate
        })
      ).rejects.toThrow("Scheduled time must be in the future")
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
        SchedulingService.schedulePost(mockUserId, {
          contentId: mockContentId,
          accountIds: mockAccountIds,
          scheduledAt: futureDate
        })
      ).rejects.toThrow("Content not found")
    })
  })

  describe("getScheduledPosts", () => {
    const mockUserId = "user-123"

    it("should return user's scheduled posts", async () => {
      const mockScheduledIds = ["post-1", "post-2"]
      const mockPost1 = {
        id: "post-1",
        contentId: "content-1",
        accountId: "account-1",
        platform: "twitter",
        content: "Post 1",
        scheduledAt: new Date(),
        status: "scheduled",
        retryCount: 0
      }

      mockRedisInstance.zrange.mockResolvedValue(mockScheduledIds)
      mockRedisInstance.get
        .mockResolvedValueOnce(JSON.stringify(mockPost1))
        .mockResolvedValueOnce(null) // Second post not found

      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ userId: mockUserId }])
          })
        })
      })

      const posts = await SchedulingService.getScheduledPosts(mockUserId)

      expect(posts).toHaveLength(1)
      expect(posts[0].id).toBe("post-1")
    })

    it("should filter posts by user ownership", async () => {
      const mockScheduledIds = ["post-1"]
      const mockPost1 = {
        id: "post-1",
        contentId: "content-1",
        accountId: "account-1",
        platform: "twitter",
        content: "Post 1",
        scheduledAt: new Date(),
        status: "scheduled",
        retryCount: 0
      }

      mockRedisInstance.zrange.mockResolvedValue(mockScheduledIds)
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockPost1))

      // Mock content not belonging to user
      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]) // No content for this user
          })
        })
      })

      const posts = await SchedulingService.getScheduledPosts(mockUserId)

      expect(posts).toHaveLength(0)
    })
  })

  describe("cancelScheduledPost", () => {
    const mockUserId = "user-123"
    const mockPostId = "post-123"

    const mockPost = {
      id: mockPostId,
      contentId: "content-123",
      accountId: "account-123",
      platform: "twitter",
      content: "Test post",
      scheduledAt: new Date(),
      status: "scheduled",
      retryCount: 0
    }

    it("should cancel scheduled post successfully", async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockPost))
      mockRedisInstance.del.mockResolvedValue(1)
      mockRedisInstance.zrem.mockResolvedValue(1)

      // Mock content ownership verification
      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ userId: mockUserId }])
          })
        })
      })

      // Mock no remaining posts for content
      mockRedisInstance.zrange.mockResolvedValue([])

      mockDbUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      })

      await SchedulingService.cancelScheduledPost(mockUserId, mockPostId)

      expect(mockRedisInstance.del).toHaveBeenCalledWith(
        `scheduled_posts:${mockPostId}`
      )
      expect(mockRedisInstance.zrem).toHaveBeenCalledWith(
        "scheduled_posts",
        mockPostId
      )
    })

    it("should handle post not found", async () => {
      mockRedisInstance.get.mockResolvedValue(null)

      await expect(
        SchedulingService.cancelScheduledPost(mockUserId, mockPostId)
      ).rejects.toThrow("Scheduled post not found")
    })

    it("should handle unauthorized cancellation", async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockPost))

      // Mock content not belonging to user
      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      })

      await expect(
        SchedulingService.cancelScheduledPost(mockUserId, mockPostId)
      ).rejects.toThrow("Unauthorized to cancel this post")
    })
  })

  describe("processDuePosts", () => {
    it("should process due posts", async () => {
      const duePostIds = ["post-1", "post-2"]
      mockRedisInstance.zrange.mockResolvedValue(duePostIds)

      // Mock processScheduledPost to avoid complex setup
      const processScheduledPostSpy = jest
        .spyOn(
          SchedulingService as unknown as { processScheduledPost: jest.Mock },
          "processScheduledPost"
        )
        .mockResolvedValue(undefined)

      await SchedulingService.processDuePosts()

      expect(processScheduledPostSpy).toHaveBeenCalledTimes(2)
      expect(processScheduledPostSpy).toHaveBeenCalledWith("post-1")
      expect(processScheduledPostSpy).toHaveBeenCalledWith("post-2")
    })

    it("should handle processing errors gracefully", async () => {
      const duePostIds = ["post-1", "post-2"]
      mockRedisInstance.zrange.mockResolvedValue(duePostIds)

      const processScheduledPostSpy = jest.spyOn(
        SchedulingService as unknown as { processScheduledPost: jest.Mock },
        "processScheduledPost"
      )
      processScheduledPostSpy
        .mockRejectedValueOnce(new Error("Processing failed"))
        .mockResolvedValueOnce(undefined)

      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      await SchedulingService.processDuePosts()

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to process scheduled post post-1:",
        expect.any(Error)
      )
      expect(processScheduledPostSpy).toHaveBeenCalledTimes(2)

      consoleSpy.mockRestore()
    })
  })

  describe("reschedulePost", () => {
    const mockUserId = "user-123"
    const mockPostId = "post-123"
    const newScheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours from now

    const mockPost = {
      id: mockPostId,
      contentId: "content-123",
      accountId: "account-123",
      platform: "twitter",
      content: "Test post",
      scheduledAt: new Date(),
      status: "scheduled",
      retryCount: 0
    }

    it("should reschedule post successfully", async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockPost))
      mockRedisInstance.setex.mockResolvedValue("OK")
      mockRedisInstance.zadd.mockResolvedValue(1)

      // Mock content ownership verification
      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ userId: mockUserId }])
          })
        })
      })

      // Mock getting posts for content (for updating earliest scheduled time)
      mockRedisInstance.zrange.mockResolvedValue([mockPostId])

      mockDbUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      })

      await SchedulingService.reschedulePost(
        mockUserId,
        mockPostId,
        newScheduledAt
      )

      expect(mockRedisInstance.setex).toHaveBeenCalled()
      expect(mockRedisInstance.zadd).toHaveBeenCalledWith("scheduled_posts", {
        score: newScheduledAt.getTime(),
        member: mockPostId
      })
    })

    it("should reject past reschedule time", async () => {
      const pastDate = new Date(Date.now() - 60 * 1000) // 1 minute ago

      await expect(
        SchedulingService.reschedulePost(mockUserId, mockPostId, pastDate)
      ).rejects.toThrow("New scheduled time must be in the future")
    })
  })
})
