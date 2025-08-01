import { GDPRComplianceService } from "../gdpr-compliance"

// Mock database
const mockDb = {
  select: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  transaction: jest.fn()
}

jest.mock("@/db", () => ({
  db: mockDb
}))

jest.mock("@/db/schema", () => ({
  books: { userId: "userId", id: "id", createdAt: "createdAt" },
  generatedContent: { userId: "userId", id: "id", createdAt: "createdAt" },
  socialAccounts: { userId: "userId", id: "id", createdAt: "createdAt" },
  postAnalytics: {
    contentId: "contentId",
    id: "id",
    lastUpdated: "lastUpdated"
  }
}))

jest.mock("drizzle-orm", () => ({
  eq: jest.fn()
}))

describe("GDPRComplianceService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("exportUserData", () => {
    it("should export user data successfully", async () => {
      const mockBooks = [
        {
          id: "book-1",
          title: "Test Book",
          author: "Test Author",
          genre: "Fiction",
          createdAt: new Date("2024-01-01"),
          analysisData: { themes: ["love", "adventure"] }
        }
      ]

      const mockContent = [
        {
          id: "content-1",
          platform: "twitter",
          content: "Test content",
          createdAt: new Date("2024-01-01"),
          publishedAt: new Date("2024-01-02")
        }
      ]

      const mockAccounts = [
        {
          id: "account-1",
          platform: "twitter",
          accountName: "@testuser",
          createdAt: new Date("2024-01-01")
        }
      ]

      const mockAnalytics = [
        {
          id: "analytics-1",
          platform: "twitter",
          impressions: 100,
          likes: 10,
          shares: 5,
          comments: 2,
          lastUpdated: new Date("2024-01-01")
        }
      ]

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce(mockBooks)
        })
      })

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce(mockContent)
        })
      })

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce(mockAccounts)
        })
      })

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          innerJoin: jest.fn().mockReturnValueOnce({
            where: jest.fn().mockResolvedValueOnce(mockAnalytics)
          })
        })
      })

      const result = await GDPRComplianceService.exportUserData("test-user-id")

      expect(result.userId).toBe("test-user-id")
      expect(result.books).toHaveLength(1)
      expect(result.generatedContent).toHaveLength(1)
      expect(result.socialAccounts).toHaveLength(1)
      expect(result.analytics).toHaveLength(1)
      expect(result.exportDate).toBeDefined()
    })

    it("should handle export errors gracefully", async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error("Database error")
      })

      await expect(
        GDPRComplianceService.exportUserData("test-user-id")
      ).rejects.toThrow("Failed to export user data")
    })
  })

  describe("deleteUserData", () => {
    it("should delete user data successfully", async () => {
      const mockTransaction = jest.fn().mockImplementation(async callback => {
        const tx = {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ id: "content-1" }])
            })
          }),
          delete: jest.fn().mockResolvedValue({ rowCount: 1 })
        }
        return await callback(tx)
      })

      mockDb.transaction = mockTransaction

      const result = await GDPRComplianceService.deleteUserData("test-user-id")

      expect(result.success).toBe(true)
      expect(result.deletedRecords.books).toBe(1)
      expect(result.deletedRecords.generatedContent).toBe(1)
      expect(result.deletedRecords.socialAccounts).toBe(1)
      expect(result.deletedRecords.analytics).toBe(1)
    })

    it("should handle deletion errors gracefully", async () => {
      mockDb.transaction.mockRejectedValue(new Error("Database error"))

      const result = await GDPRComplianceService.deleteUserData("test-user-id")

      expect(result.success).toBe(false)
      expect(result.errors).toContain("Failed to delete user data")
    })
  })

  describe("anonymizeUserData", () => {
    it("should anonymize user data successfully", async () => {
      const mockTransaction = jest.fn().mockImplementation(async callback => {
        const tx = {
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue({ rowCount: 1 })
            })
          }),
          delete: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue({ rowCount: 1 })
          })
        }
        return await callback(tx)
      })

      mockDb.transaction = mockTransaction

      const result =
        await GDPRComplianceService.anonymizeUserData("test-user-id")

      expect(result.success).toBe(true)
      expect(result.deletedRecords.books).toBe(1)
      expect(result.deletedRecords.generatedContent).toBe(1)
      expect(result.deletedRecords.socialAccounts).toBe(1)
    })
  })

  describe("validateConsent", () => {
    it("should validate recent consent", () => {
      const recentConsent = {
        analytics: true,
        marketing: false,
        functional: true,
        timestamp: new Date().toISOString()
      }

      const result = GDPRComplianceService.validateConsent(recentConsent)
      expect(result).toBe(true)
    })

    it("should reject old consent", () => {
      const oldConsent = {
        analytics: true,
        marketing: false,
        functional: true,
        timestamp: new Date(
          Date.now() - 2 * 365 * 24 * 60 * 60 * 1000
        ).toISOString() // 2 years ago
      }

      const result = GDPRComplianceService.validateConsent(oldConsent)
      expect(result).toBe(false)
    })

    it("should require functional consent", () => {
      const noFunctionalConsent = {
        analytics: true,
        marketing: true,
        functional: false,
        timestamp: new Date().toISOString()
      }

      const result = GDPRComplianceService.validateConsent(noFunctionalConsent)
      expect(result).toBe(false)
    })
  })

  describe("shouldRetainData", () => {
    it("should retain recent data", () => {
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const result = GDPRComplianceService.shouldRetainData(recentDate, "books")
      expect(result).toBe(true)
    })

    it("should not retain old data", () => {
      const oldDate = new Date(Date.now() - 8 * 365 * 24 * 60 * 60 * 1000) // 8 years ago
      const result = GDPRComplianceService.shouldRetainData(oldDate, "books")
      expect(result).toBe(false)
    })

    it("should handle unknown data types", () => {
      const recentDate = new Date()
      const result = GDPRComplianceService.shouldRetainData(
        recentDate,
        "unknown"
      )
      expect(result).toBe(true) // Default to retain
    })
  })

  describe("logDataProcessing", () => {
    it("should log data processing activity", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation()

      const activity = {
        userId: "test-user",
        action: "export" as const,
        dataTypes: ["books", "content"],
        timestamp: new Date().toISOString(),
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }

      await GDPRComplianceService.logDataProcessing(activity)

      expect(consoleSpy).toHaveBeenCalledWith(
        "GDPR Activity Log:",
        expect.objectContaining(activity)
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        "Encrypted audit log created:",
        expect.stringContaining("...")
      )

      consoleSpy.mockRestore()
    })
  })
})
