import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { invalidateCache } from "@/lib/cache-service"
import { z } from "zod"
import { InputValidator } from "@/lib/input-validation"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bookId } = await params

    // Get book details
    const [book] = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    // Return book details (excluding sensitive data like full text content)
    return NextResponse.json({
      success: true,
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        genre: book.genre,
        fileName: book.fileName,
        fileSize: book.fileSize,
        analysisStatus: book.analysisStatus,
        analysisData: book.analysisData,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        hasTextContent: !!book.textContent,
        textContentLength: book.textContent?.length || 0
      }
    })
  } catch (error) {
    console.error("Get book endpoint error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "Failed to retrieve book details"
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bookId } = await params

    // Check if book exists and belongs to user
    const [book] = await db
      .select({ fileUrl: books.fileUrl })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    // Delete book record from database
    await db
      .delete(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))

    // Invalidate book library cache to ensure fresh data on next load
    await invalidateCache("BOOK_LIBRARY", userId)

    // TODO: Delete file from Supabase Storage
    // This would be implemented when we have proper storage cleanup

    return NextResponse.json({
      success: true,
      message: "Book deleted successfully"
    })
  } catch (error) {
    console.error("Delete book endpoint error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "Failed to delete book"
      },
      { status: 500 }
    )
  }
}

// Schema for validating the rename request
const renameBookSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  author: z.string().max(255, "Author name too long").optional()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bookId } = await params

    // Parse and validate request body
    const body = await request.json()
    const validation = renameBookSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid input", 
          details: validation.error.errors 
        }, 
        { status: 400 }
      )
    }

    const { title, author } = validation.data

    // Sanitize input
    const sanitizedTitle = InputValidator.sanitizeText(title)
    const sanitizedAuthor = author ? InputValidator.sanitizeText(author) : null

    // Check if book exists and belongs to user
    const [existingBook] = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    if (!existingBook) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    // Update book record
    const [updatedBook] = await db
      .update(books)
      .set({
        title: sanitizedTitle,
        author: sanitizedAuthor,
        updatedAt: new Date()
      })
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .returning()

    // Invalidate cache to ensure fresh data
    await invalidateCache("BOOK_LIBRARY", userId)

    return NextResponse.json({
      success: true,
      message: "Book renamed successfully",
      book: {
        id: updatedBook.id,
        title: updatedBook.title,
        author: updatedBook.author,
        updatedAt: updatedBook.updatedAt
      }
    })
  } catch (error) {
    console.error("Rename book endpoint error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "Failed to rename book"
      },
      { status: 500 }
    )
  }
}
