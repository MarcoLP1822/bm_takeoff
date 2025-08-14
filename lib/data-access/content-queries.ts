/**
 * Centralized Content Data Access Layer
 * Phase 2.3: Centralizzazione Logica Dati
 * 
 * This module provides centralized, secure, and optimized data access
 * for content-related operations with built-in authorization checks.
 */

import { db } from "@/db"
import { books, generatedContent, type InsertGeneratedContent, type SelectGeneratedContent } from "@/db/schema"
import { and, eq, desc, count, isNotNull } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { cache } from "react"
import { validateBookAccess, getCurrentUserId } from "./book-queries"

// Types for better type safety
export interface ContentWithBook extends SelectGeneratedContent {
  bookTitle?: string | null
  bookAuthor?: string | null
}

export interface ContentFilters {
  platform?: "twitter" | "instagram" | "linkedin" | "facebook"
  status?: "draft" | "scheduled" | "published" | "failed"
  contentType?: "post" | "story" | "article"
  bookId?: string
  hasImage?: boolean
  scheduled?: boolean
  limit?: number
  offset?: number
}

export interface ContentStats {
  totalContent: number
  byStatus: Record<string, number>
  byPlatform: Record<string, number>
  scheduledCount: number
  publishedCount: number
}

/**
 * Validates that a user has access to a specific content item
 * @param userId - The user ID from Clerk auth
 * @param contentId - The content ID to validate access for
 * @returns Promise<SelectGeneratedContent | null> - The content if accessible, null if not found or unauthorized
 */
export const validateContentAccess = cache(async (userId: string, contentId: string): Promise<SelectGeneratedContent | null> => {
  try {
    const [contentItem] = await db
      .select({
        id: generatedContent.id,
        bookId: generatedContent.bookId,
        userId: generatedContent.userId,
        platform: generatedContent.platform,
        contentType: generatedContent.contentType,
        content: generatedContent.content,
        hashtags: generatedContent.hashtags,
        imageUrl: generatedContent.imageUrl,
        status: generatedContent.status,
        scheduledAt: generatedContent.scheduledAt,
        publishedAt: generatedContent.publishedAt,
        socialPostId: generatedContent.socialPostId,
        sourceType: generatedContent.sourceType,
        sourceContent: generatedContent.sourceContent,
        variationGroupId: generatedContent.variationGroupId,
        generationContext: generatedContent.generationContext,
        createdAt: generatedContent.createdAt,
        updatedAt: generatedContent.updatedAt
      })
      .from(generatedContent)
      .leftJoin(books, eq(books.id, generatedContent.bookId))
      .where(and(eq(generatedContent.id, contentId), eq(books.userId, userId)))
      .limit(1)

    return contentItem || null
  } catch (error) {
    console.error("Error validating content access:", error)
    return null
  }
})

/**
 * Finds a content item for a specific user with authorization check
 * @param userId - The user ID from Clerk auth
 * @param contentId - The content ID to find
 * @returns Promise<ContentWithBook | null> - The content with book metadata or null
 */
export const findContentForUser = cache(async (userId: string, contentId: string): Promise<ContentWithBook | null> => {
  try {
    const [result] = await db
      .select({
        id: generatedContent.id,
        bookId: generatedContent.bookId,
        userId: generatedContent.userId,
        platform: generatedContent.platform,
        contentType: generatedContent.contentType,
        content: generatedContent.content,
        hashtags: generatedContent.hashtags,
        imageUrl: generatedContent.imageUrl,
        status: generatedContent.status,
        scheduledAt: generatedContent.scheduledAt,
        publishedAt: generatedContent.publishedAt,
        socialPostId: generatedContent.socialPostId,
        sourceType: generatedContent.sourceType,
        sourceContent: generatedContent.sourceContent,
        variationGroupId: generatedContent.variationGroupId,
        generationContext: generatedContent.generationContext,
        createdAt: generatedContent.createdAt,
        updatedAt: generatedContent.updatedAt,
        bookTitle: books.title,
        bookAuthor: books.author
      })
      .from(generatedContent)
      .leftJoin(books, eq(books.id, generatedContent.bookId))
      .where(and(eq(generatedContent.id, contentId), eq(books.userId, userId)))
      .limit(1)

    return result || null
  } catch (error) {
    console.error("Error finding content for user:", error)
    return null
  }
})

/**
 * Gets all content for a user with optional filtering
 * @param userId - The user ID from Clerk auth
 * @param filters - Optional filters to apply
 * @returns Promise<ContentWithBook[]> - Array of content items with book metadata
 */
export const getUserContent = cache(async (userId: string, filters: ContentFilters = {}): Promise<ContentWithBook[]> => {
  try {
    const {
      platform,
      status,
      contentType,
      bookId,
      hasImage = false,
      scheduled = false,
      limit = 50,
      offset = 0
    } = filters

    const query = db
      .select({
        id: generatedContent.id,
        bookId: generatedContent.bookId,
        userId: generatedContent.userId,
        platform: generatedContent.platform,
        contentType: generatedContent.contentType,
        content: generatedContent.content,
        hashtags: generatedContent.hashtags,
        imageUrl: generatedContent.imageUrl,
        status: generatedContent.status,
        scheduledAt: generatedContent.scheduledAt,
        publishedAt: generatedContent.publishedAt,
        socialPostId: generatedContent.socialPostId,
        sourceType: generatedContent.sourceType,
        sourceContent: generatedContent.sourceContent,
        variationGroupId: generatedContent.variationGroupId,
        generationContext: generatedContent.generationContext,
        createdAt: generatedContent.createdAt,
        updatedAt: generatedContent.updatedAt,
        bookTitle: books.title,
        bookAuthor: books.author
      })
      .from(generatedContent)
      .leftJoin(books, eq(books.id, generatedContent.bookId))

    // Build where conditions
    const conditions = [eq(books.userId, userId)]
    
    if (platform) {
      conditions.push(eq(generatedContent.platform, platform))
    }
    
    if (status) {
      conditions.push(eq(generatedContent.status, status))
    }
    
    if (contentType) {
      conditions.push(eq(generatedContent.contentType, contentType))
    }
    
    if (bookId) {
      conditions.push(eq(generatedContent.bookId, bookId))
    }
    
    if (hasImage) {
      conditions.push(isNotNull(generatedContent.imageUrl))
    }
    
    if (scheduled) {
      conditions.push(isNotNull(generatedContent.scheduledAt))
    }

    const result = await query
      .where(and(...conditions))
      .orderBy(desc(generatedContent.createdAt))
      .limit(limit)
      .offset(offset)

    return result
  } catch (error) {
    console.error("Error getting user content:", error)
    return []
  }
})

/**
 * Gets content statistics for a user
 * @param userId - The user ID from Clerk auth
 * @returns Promise<ContentStats> - Content statistics
 */
export const getUserContentStats = cache(async (userId: string): Promise<ContentStats> => {
  try {
    const result = await db
      .select({
        status: generatedContent.status,
        platform: generatedContent.platform,
        hasScheduled: generatedContent.scheduledAt,
        hasPublished: generatedContent.publishedAt,
        count: count()
      })
      .from(generatedContent)
      .leftJoin(books, eq(books.id, generatedContent.bookId))
      .where(eq(books.userId, userId))
      .groupBy(generatedContent.status, generatedContent.platform, generatedContent.scheduledAt, generatedContent.publishedAt)

    const stats: ContentStats = {
      totalContent: 0,
      byStatus: {},
      byPlatform: {},
      scheduledCount: 0,
      publishedCount: 0
    }

    result.forEach(row => {
      stats.totalContent += row.count
      stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + row.count
      stats.byPlatform[row.platform] = (stats.byPlatform[row.platform] || 0) + row.count
      
      if (row.hasScheduled) {
        stats.scheduledCount += row.count
      }
      
      if (row.hasPublished) {
        stats.publishedCount += row.count
      }
    })

    return stats
  } catch (error) {
    console.error("Error getting user content stats:", error)
    return {
      totalContent: 0,
      byStatus: {},
      byPlatform: {},
      scheduledCount: 0,
      publishedCount: 0
    }
  }
})

/**
 * Creates new content for a book with authorization check
 * @param bookId - The book ID to create content for
 * @param contentData - The content data to create
 * @returns Promise<SelectGeneratedContent | null> - The created content or null on failure
 */
export const createContentForBook = async (
  bookId: string,
  contentData: Omit<InsertGeneratedContent, "bookId" | "userId">
): Promise<SelectGeneratedContent | null> => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error("User not authenticated")
    }

    // Validate book access first
    const book = await validateBookAccess(userId, bookId)
    if (!book) {
      throw new Error("Book not found or access denied")
    }

    const [newContent] = await db
      .insert(generatedContent)
      .values({
        ...contentData,
        bookId,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()

    return newContent
  } catch (error) {
    console.error("Error creating content for book:", error)
    return null
  }
}

/**
 * Updates content for the authenticated user with authorization check
 * @param contentId - The content ID to update
 * @param updates - The updates to apply
 * @returns Promise<SelectGeneratedContent | null> - The updated content or null on failure
 */
export const updateContentForUser = async (
  contentId: string,
  updates: Partial<Omit<SelectGeneratedContent, "id" | "bookId" | "userId" | "createdAt">>
): Promise<SelectGeneratedContent | null> => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error("User not authenticated")
    }

    // Validate access first
    const existingContent = await validateContentAccess(userId, contentId)
    if (!existingContent) {
      return null
    }

    const [updatedContent] = await db
      .update(generatedContent)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(generatedContent.id, contentId))
      .returning()

    return updatedContent
  } catch (error) {
    console.error("Error updating content for user:", error)
    return null
  }
}

/**
 * Deletes content for the authenticated user with authorization check
 * @param contentId - The content ID to delete
 * @returns Promise<boolean> - Success status
 */
export const deleteContentForUser = async (contentId: string): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error("User not authenticated")
    }

    // Validate access first
    const existingContent = await validateContentAccess(userId, contentId)
    if (!existingContent) {
      return false
    }

    await db
      .delete(generatedContent)
      .where(eq(generatedContent.id, contentId))

    return true
  } catch (error) {
    console.error("Error deleting content for user:", error)
    return false
  }
}

/**
 * Gets content by book for the authenticated user
 * @param bookId - The book ID to get content for
 * @param filters - Optional additional filters
 * @returns Promise<ContentWithBook[]> - Array of content items for the book
 */
export const getContentByBook = cache(async (
  bookId: string,
  filters: Omit<ContentFilters, "bookId"> = {}
): Promise<ContentWithBook[]> => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }

  // Validate book access first
  const book = await validateBookAccess(userId, bookId)
  if (!book) {
    return []
  }

  return getUserContent(userId, { ...filters, bookId })
})

/**
 * Gets scheduled content for the authenticated user
 * @param filters - Optional filters to apply
 * @returns Promise<ContentWithBook[]> - Array of scheduled content items
 */
export const getScheduledContent = cache(async (filters: Omit<ContentFilters, "scheduled"> = {}): Promise<ContentWithBook[]> => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }

  return getUserContent(userId, { ...filters, scheduled: true })
})
