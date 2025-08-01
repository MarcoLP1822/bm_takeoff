import { db } from "@/db"
import {
  books,
  generatedContent,
  socialAccounts,
  postAnalytics
} from "@/db/schema"
import { eq } from "drizzle-orm"
import { EncryptionService } from "./encryption"

export interface GDPRDataExport {
  userId: string
  exportDate: string
  books: Array<{
    id: string
    title: string
    author: string
    genre: string
    createdAt: string
    analysisData: unknown
  }>
  generatedContent: Array<{
    id: string
    platform: string
    content: string
    createdAt: string
    publishedAt: string | null
  }>
  socialAccounts: Array<{
    id: string
    platform: string
    accountName: string
    createdAt: string
  }>
  analytics: Array<{
    id: string
    platform: string
    impressions: number
    likes: number
    shares: number
    comments: number
    lastUpdated: string
  }>
}

export interface GDPRDeletionResult {
  success: boolean
  deletedRecords: {
    books: number
    generatedContent: number
    socialAccounts: number
    analytics: number
  }
  errors?: string[]
}

export class GDPRComplianceService {
  /**
   * Export all user data for GDPR compliance
   */
  static async exportUserData(userId: string): Promise<GDPRDataExport> {
    try {
      // Fetch all user data
      const [userBooks, userContent, userAccounts, userAnalytics] =
        await Promise.all([
          db.select().from(books).where(eq(books.userId, userId)),
          db
            .select()
            .from(generatedContent)
            .where(eq(generatedContent.userId, userId)),
          db
            .select()
            .from(socialAccounts)
            .where(eq(socialAccounts.userId, userId)),
          db
            .select({
              id: postAnalytics.id,
              platform: postAnalytics.platform,
              impressions: postAnalytics.impressions,
              likes: postAnalytics.likes,
              shares: postAnalytics.shares,
              comments: postAnalytics.comments,
              lastUpdated: postAnalytics.lastUpdated
            })
            .from(postAnalytics)
            .innerJoin(
              generatedContent,
              eq(postAnalytics.contentId, generatedContent.id)
            )
            .where(eq(generatedContent.userId, userId))
        ])

      // Sanitize and format data for export
      const exportData: GDPRDataExport = {
        userId,
        exportDate: new Date().toISOString(),
        books: userBooks.map(book => ({
          id: book.id,
          title: book.title,
          author: book.author || "",
          genre: book.genre || "",
          createdAt: book.createdAt.toISOString(),
          analysisData: book.analysisData
        })),
        generatedContent: userContent.map(content => ({
          id: content.id,
          platform: content.platform,
          content: content.content,
          createdAt: content.createdAt.toISOString(),
          publishedAt: content.publishedAt?.toISOString() || null
        })),
        socialAccounts: userAccounts.map(account => ({
          id: account.id,
          platform: account.platform,
          accountName: account.accountName,
          createdAt: account.createdAt.toISOString()
        })),
        analytics: userAnalytics.map(analytics => ({
          id: analytics.id,
          platform: analytics.platform,
          impressions: analytics.impressions || 0,
          likes: analytics.likes || 0,
          shares: analytics.shares || 0,
          comments: analytics.comments || 0,
          lastUpdated: analytics.lastUpdated.toISOString()
        }))
      }

      return exportData
    } catch (error) {
      console.error("GDPR data export error:", error)
      throw new Error("Failed to export user data")
    }
  }

  /**
   * Delete all user data for GDPR compliance
   */
  static async deleteUserData(userId: string): Promise<GDPRDeletionResult> {
    const errors: string[] = []
    const deletedRecords = {
      books: 0,
      generatedContent: 0,
      socialAccounts: 0,
      analytics: 0
    }

    try {
      // Start transaction for atomic deletion
      await db.transaction(async tx => {
        // Delete analytics data first (foreign key constraints)
        const contentIds = await tx
          .select({ id: generatedContent.id })
          .from(generatedContent)
          .where(eq(generatedContent.userId, userId))

        if (contentIds.length > 0) {
          for (const { id } of contentIds) {
            const analyticsResult = await tx
              .delete(postAnalytics)
              .where(eq(postAnalytics.contentId, id))
            deletedRecords.analytics += analyticsResult.length || 0
          }
        }

        // Delete generated content
        const contentResult = await tx
          .delete(generatedContent)
          .where(eq(generatedContent.userId, userId))
        deletedRecords.generatedContent = contentResult.length || 0

        // Delete social accounts
        const accountsResult = await tx
          .delete(socialAccounts)
          .where(eq(socialAccounts.userId, userId))
        deletedRecords.socialAccounts = accountsResult.length || 0

        // Delete books
        const booksResult = await tx
          .delete(books)
          .where(eq(books.userId, userId))
        deletedRecords.books = booksResult.length || 0
      })

      return {
        success: true,
        deletedRecords,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      console.error("GDPR data deletion error:", error)
      errors.push("Failed to delete user data")

      return {
        success: false,
        deletedRecords,
        errors
      }
    }
  }

  /**
   * Anonymize user data instead of deletion
   */
  static async anonymizeUserData(userId: string): Promise<GDPRDeletionResult> {
    const errors: string[] = []
    const deletedRecords = {
      books: 0,
      generatedContent: 0,
      socialAccounts: 0,
      analytics: 0
    }

    try {
      await db.transaction(async tx => {
        // Anonymize books
        const booksResult = await tx
          .update(books)
          .set({
            userId: "anonymized",
            title: "Anonymized Book",
            author: "Anonymized Author",
            textContent: null,
            analysisData: null
          })
          .where(eq(books.userId, userId))
        deletedRecords.books = booksResult.length || 0

        // Anonymize generated content
        const contentResult = await tx
          .update(generatedContent)
          .set({
            userId: "anonymized",
            content: "Anonymized content"
          })
          .where(eq(generatedContent.userId, userId))
        deletedRecords.generatedContent = contentResult.length || 0

        // Delete social accounts (can't be anonymized due to tokens)
        const accountsResult = await tx
          .delete(socialAccounts)
          .where(eq(socialAccounts.userId, userId))
        deletedRecords.socialAccounts = accountsResult.length || 0
      })

      return {
        success: true,
        deletedRecords,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      console.error("GDPR data anonymization error:", error)
      errors.push("Failed to anonymize user data")

      return {
        success: false,
        deletedRecords,
        errors
      }
    }
  }

  /**
   * Generate encrypted data export file
   */
  static async generateEncryptedExport(userId: string): Promise<string> {
    const exportData = await this.exportUserData(userId)
    return EncryptionService.encryptUserData(
      exportData as unknown as Record<string, unknown>
    )
  }

  /**
   * Decrypt exported data file
   */
  static decryptExportData(encryptedData: string): GDPRDataExport {
    const decryptedData = EncryptionService.decryptUserData(encryptedData)
    return decryptedData as unknown as GDPRDataExport
  }

  /**
   * Validate user consent for data processing
   */
  static validateConsent(consentData: {
    analytics: boolean
    marketing: boolean
    functional: boolean
    timestamp: string
  }): boolean {
    // Check if consent is recent (within 1 year)
    const consentDate = new Date(consentData.timestamp)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    if (consentDate < oneYearAgo) {
      return false
    }

    // At minimum, functional consent is required
    return consentData.functional
  }

  /**
   * Log data processing activity for audit trail
   */
  static async logDataProcessing(activity: {
    userId: string
    action: "export" | "delete" | "anonymize" | "access"
    dataTypes: string[]
    timestamp: string
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    try {
      // In a real implementation, this would log to a secure audit system
      console.log("GDPR Activity Log:", {
        ...activity,
        timestamp: new Date().toISOString()
      })

      // Store in encrypted format for audit purposes
      const encryptedLog = EncryptionService.encrypt(JSON.stringify(activity))

      // Here you would typically store this in a dedicated audit log table
      // For now, we'll just log it
      console.log(
        "Encrypted audit log created:",
        encryptedLog.substring(0, 50) + "..."
      )
    } catch (error) {
      console.error("Failed to log GDPR activity:", error)
    }
  }

  /**
   * Check data retention policies
   */
  static shouldRetainData(createdAt: Date, dataType: string): boolean {
    const now = new Date()
    const ageInDays = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Data retention policies (in days)
    const retentionPolicies = {
      books: 2555, // 7 years
      generatedContent: 1095, // 3 years
      socialAccounts: 365, // 1 year
      analytics: 730 // 2 years
    }

    const retentionPeriod =
      retentionPolicies[dataType as keyof typeof retentionPolicies]
    return retentionPeriod ? ageInDays < retentionPeriod : true
  }

  /**
   * Clean up expired data based on retention policies
   */
  static async cleanupExpiredData(): Promise<{
    deletedBooks: number
    deletedContent: number
    deletedAccounts: number
    deletedAnalytics: number
  }> {
    const results = {
      deletedBooks: 0,
      deletedContent: 0,
      deletedAccounts: 0,
      deletedAnalytics: 0
    }

    try {
      const now = new Date()

      // Calculate cutoff dates
      const booksCutoff = new Date(now.getTime() - 2555 * 24 * 60 * 60 * 1000)
      const contentCutoff = new Date(now.getTime() - 1095 * 24 * 60 * 60 * 1000)
      const accountsCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      const analyticsCutoff = new Date(
        now.getTime() - 730 * 24 * 60 * 60 * 1000
      )

      await db.transaction(async tx => {
        // Delete expired analytics
        const analyticsResult = await tx
          .delete(postAnalytics)
          .where(eq(postAnalytics.lastUpdated, analyticsCutoff))
        results.deletedAnalytics = analyticsResult.length || 0

        // Delete expired content
        const contentResult = await tx
          .delete(generatedContent)
          .where(eq(generatedContent.createdAt, contentCutoff))
        results.deletedContent = contentResult.length || 0

        // Delete expired accounts
        const accountsResult = await tx
          .delete(socialAccounts)
          .where(eq(socialAccounts.createdAt, accountsCutoff))
        results.deletedAccounts = accountsResult.length || 0

        // Delete expired books
        const booksResult = await tx
          .delete(books)
          .where(eq(books.createdAt, booksCutoff))
        results.deletedBooks = booksResult.length || 0
      })

      return results
    } catch (error) {
      console.error("Data cleanup error:", error)
      throw new Error("Failed to cleanup expired data")
    }
  }
}
