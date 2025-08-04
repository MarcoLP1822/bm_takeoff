/**
 * Centralized Book Data Access Layer
 * Phase 2.3: Centralizzazione Logica Dati
 * 
 * This module provides centralized, secure, and optimized data access
 * for book-related operations with built-in authorization checks.
 */

import { db } from "@/db"
import { books, generatedContent, type InsertBook, type SelectBook } from "@/db/schema"
import { and, eq, isNotNull, desc, count } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { cache } from "react"

// Types for better type safety
export interface BookWithContent extends SelectBook {
  contentCount?: number
  hasTextContent?: boolean
}

export interface BookFilters {
  status?: "pending" | "processing" | "completed" | "failed"
  hasGenre?: boolean
  hasAuthor?: boolean
  limit?: number
  offset?: number
}

export interface ContentWithBook {
  id: string
  platform: string
  contentType: string
  content: string
  status: string
  scheduledAt: Date | null
  publishedAt: Date | null
  bookId: string
  createdAt: Date
  updatedAt: Date
  bookTitle: string | null
}

export interface UserContentFilters {
  platform?: "twitter" | "instagram" | "linkedin" | "facebook"
  status?: "draft" | "scheduled" | "published" | "failed"
  bookId?: string
  limit?: number
  offset?: number
}

/**
 * Validates that a user has access to a specific book
 * @param userId - The user ID from Clerk auth
 * @param bookId - The book ID to validate access for
 * @returns Promise<SelectBook | null> - The book if accessible, null if not found or unauthorized
 */
export const validateBookAccess = cache(async (userId: string, bookId: string): Promise<SelectBook | null> => {
  try {
    const [book] = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    return book || null
  } catch (error) {
    console.error("Error validating book access:", error)
    return null
  }
})

/**
 * Finds a book for a specific user with authorization check
 * @param userId - The user ID from Clerk auth
 * @param bookId - The book ID to find
 * @returns Promise<BookWithContent | null> - The book with additional metadata or null
 */
export const findBookForUser = cache(async (userId: string, bookId: string): Promise<BookWithContent | null> => {
  try {
    // Get book with content count in a single query
    const result = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        genre: books.genre,
        fileUrl: books.fileUrl,
        fileName: books.fileName,
        fileSize: books.fileSize,
        textContent: books.textContent,
        analysisStatus: books.analysisStatus,
        analysisData: books.analysisData,
        userId: books.userId,
        createdAt: books.createdAt,
        updatedAt: books.updatedAt,
        contentCount: count(generatedContent.id)
      })
      .from(books)
      .leftJoin(generatedContent, eq(generatedContent.bookId, books.id))
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .groupBy(books.id)
      .limit(1)

    if (result.length === 0) {
      return null
    }

    const bookData = result[0]
    return {
      ...bookData,
      hasTextContent: !!bookData.textContent,
      contentCount: bookData.contentCount || 0
    }
  } catch (error) {
    console.error("Error finding book for user:", error)
    return null
  }
})

/**
 * Gets all books for a user with optional filtering
 * @param userId - The user ID from Clerk auth
 * @param filters - Optional filters to apply
 * @returns Promise<BookWithContent[]> - Array of books with metadata
 */
export const getUserBooks = cache(async (userId: string, filters: BookFilters = {}): Promise<BookWithContent[]> => {
  try {
    const {
      status,
      hasGenre = false,
      hasAuthor = false,
      limit = 50,
      offset = 0
    } = filters

    const query = db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        genre: books.genre,
        fileUrl: books.fileUrl,
        fileName: books.fileName,
        fileSize: books.fileSize,
        textContent: books.textContent,
        analysisStatus: books.analysisStatus,
        analysisData: books.analysisData,
        userId: books.userId,
        createdAt: books.createdAt,
        updatedAt: books.updatedAt,
        contentCount: count(generatedContent.id)
      })
      .from(books)
      .leftJoin(generatedContent, eq(generatedContent.bookId, books.id))

    // Build where conditions
    const conditions = [eq(books.userId, userId)]
    
    if (status) {
      conditions.push(eq(books.analysisStatus, status))
    }
    
    if (hasGenre) {
      conditions.push(isNotNull(books.genre))
    }
    
    if (hasAuthor) {
      conditions.push(isNotNull(books.author))
    }

    const result = await query
      .where(and(...conditions))
      .groupBy(books.id)
      .orderBy(desc(books.createdAt))
      .limit(limit)
      .offset(offset)

    return result.map(book => ({
      ...book,
      hasTextContent: !!book.textContent,
      contentCount: book.contentCount || 0
    }))
  } catch (error) {
    console.error("Error getting user books:", error)
    return []
  }
})

/**
 * Gets content for a user with optional filtering
 * @param userId - The user ID from Clerk auth  
 * @param filters - Optional filters to apply
 * @returns Promise<ContentWithBook[]> - Array of content items
 */
export const getUserContent = cache(async (userId: string, filters: UserContentFilters = {}): Promise<ContentWithBook[]> => {
  try {
    const {
      platform,
      status,
      bookId,
      limit = 50,
      offset = 0
    } = filters

    const query = db
      .select({
        id: generatedContent.id,
        platform: generatedContent.platform,
        contentType: generatedContent.contentType,
        content: generatedContent.content,
        status: generatedContent.status,
        scheduledAt: generatedContent.scheduledAt,
        publishedAt: generatedContent.publishedAt,
        bookId: generatedContent.bookId,
        createdAt: generatedContent.createdAt,
        updatedAt: generatedContent.updatedAt,
        bookTitle: books.title
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
    
    if (bookId) {
      conditions.push(eq(generatedContent.bookId, bookId))
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
 * Gets current authenticated user ID with error handling
 * @returns Promise<string | null> - User ID or null if not authenticated
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  try {
    const { userId } = await auth()
    return userId
  } catch (error) {
    console.error("Error getting current user ID:", error)
    return null
  }
})

/**
 * Creates a new book for the authenticated user
 * @param bookData - The book data to create
 * @returns Promise<SelectBook | null> - The created book or null on failure
 */
export const createBookForUser = async (bookData: Omit<InsertBook, "userId">): Promise<SelectBook | null> => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error("User not authenticated")
    }

    const [newBook] = await db
      .insert(books)
      .values({
        ...bookData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()

    return newBook
  } catch (error) {
    console.error("Error creating book for user:", error)
    return null
  }
}

/**
 * Updates a book for the authenticated user with authorization check
 * @param bookId - The book ID to update
 * @param updates - The updates to apply
 * @returns Promise<SelectBook | null> - The updated book or null on failure
 */
export const updateBookForUser = async (
  bookId: string, 
  updates: Partial<Omit<SelectBook, "id" | "userId" | "createdAt">>
): Promise<SelectBook | null> => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error("User not authenticated")
    }

    // Validate access first
    const existingBook = await validateBookAccess(userId, bookId)
    if (!existingBook) {
      return null
    }

    const [updatedBook] = await db
      .update(books)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .returning()

    return updatedBook
  } catch (error) {
    console.error("Error updating book for user:", error)
    return null
  }
}

/**
 * Deletes a book for the authenticated user with authorization check
 * @param bookId - The book ID to delete
 * @returns Promise<boolean> - Success status
 */
export const deleteBookForUser = async (bookId: string): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      throw new Error("User not authenticated")
    }

    // Validate access first
    const existingBook = await validateBookAccess(userId, bookId)
    if (!existingBook) {
      return false
    }

    // Delete related generated content first
    await db
      .delete(generatedContent)
      .where(eq(generatedContent.bookId, bookId))

    // Delete the book
    await db
      .delete(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))

    return true
  } catch (error) {
    console.error("Error deleting book for user:", error)
    return false
  }
}
