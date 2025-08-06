import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import {
  analyzeBookContent,
  validateAndNormalizeAnalysisResult,
  isAIServiceConfigured,
  prepareTextForAnalysis,
  estimateAnalysisTime
} from "@/lib/ai-analysis"
import {
  withAuth,
  ErrorCreators,
  RetryHandler,
  AppError
} from "@/lib/error-handling"
import {
  compressBookContent,
  decompressBookContent
} from "@/lib/compression-service"
import { invalidateCache } from "@/lib/cache-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    // Check authentication
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract bookId from params
    const { bookId } = await params

    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      )
    }

    // Get book details with retry
    const book = await RetryHandler.withRetry(
      async () => {
        const [foundBook] = await db
          .select()
          .from(books)
          .where(and(eq(books.id, bookId), eq(books.userId, userId)))
          .limit(1)

        if (!foundBook) {
          throw ErrorCreators.notFound("Book", bookId)
        }

        return foundBook
      },
      3,
      1000
    )

    // Check if book has text content
    if (!book.textContent) {
      return NextResponse.json(
        {
          error:
            "Book has no text content to analyze. Please re-upload the file or try text extraction again."
        },
        { status: 400 }
      )
    }

    // Check if AI service is configured
    if (!isAIServiceConfigured()) {
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 503 }
      )
    }

    // Update status to processing with retry
    await RetryHandler.withRetry(
      async () => {
        await db
          .update(books)
          .set({
            analysisStatus: "processing",
            updatedAt: new Date()
          })
          .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      },
      3,
      1000
    )

    // Prepare text and estimate time
    const preparedText = prepareTextForAnalysis(book.textContent)
    const estimatedTime = estimateAnalysisTime(preparedText.length)

    // Start AI analysis in the background
    processBookAnalysis(
      bookId,
      preparedText,
      book.title,
      book.author,
      userId
    ).catch(error => {
      console.error("Background analysis failed:", error)
    })

    return NextResponse.json({
      success: true,
      message: "Analysis started successfully",
      status: "processing",
      estimatedTime: estimatedTime,
      bookTitle: book.title
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { error: "Failed to start analysis" },
      { status: 500 }
    )
  }
}

/**
 * Process book analysis in the background with comprehensive error handling
 */
async function processBookAnalysis(
  bookId: string,
  textContent: string,
  title: string,
  author: string | null,
  userId: string
): Promise<void> {
  try {
    console.log(`Starting AI analysis for book: ${title}`)
    console.log("Original text content length:", textContent?.length || 0)
    console.log("Original text preview:", textContent?.substring(0, 200) || "NO CONTENT")

    // Check if we have compressed text content, decompress if needed
    let processedText = textContent
    const decompressed = await decompressBookContent(bookId)
    if (decompressed) {
      console.log("Found compressed content, using decompressed version")
      console.log("Decompressed text length:", decompressed.length)
      console.log("Decompressed text preview:", decompressed.substring(0, 200))
      processedText = decompressed
    } else {
      console.log("No compressed content found, using original text")
      // Compress and cache the text content for future use
      if (textContent && textContent.trim().length > 100) {
        await compressBookContent(bookId, textContent)
        console.log("Text content compressed and cached")
      } else {
        console.log("WARNING: Original text content is too short to compress:", textContent?.length || 0)
      }
    }

    console.log("Final processed text length:", processedText?.length || 0)
    console.log("Final processed text preview:", processedText?.substring(0, 200) || "NO PROCESSED TEXT")

    // Perform AI analysis with retry logic
    const analysisResult = await RetryHandler.withRetry(
      async () => {
        return await analyzeBookContent(
          processedText,
          title,
          bookId,
          userId,
          author || undefined,
          {
            maxRetries: 2, // Internal retries within the AI service
            includeChapterSummaries: true
          }
        )
      },
      3,
      5000
    ) // External retry wrapper

    // Validate and normalize the result
    const normalizedResult = validateAndNormalizeAnalysisResult(analysisResult)

    // Store the analysis results with retry
    await RetryHandler.withRetry(
      async () => {
        await db
          .update(books)
          .set({
            analysisStatus: "completed",
            analysisData: normalizedResult,
            genre: normalizedResult.genre, // Populate the genre field
            updatedAt: new Date()
          })
          .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      },
      3,
      1000
    )

    // Invalidate related caches
    await invalidateCache("BOOK_LIBRARY", userId)
    await invalidateCache("AI_ANALYSIS", userId, bookId)

    console.log(`Analysis completed successfully for book: ${title}`)
  } catch (error) {
    console.error("Analysis processing error:", error)

    // Determine error type and create appropriate AppError
    let analysisError: AppError
    if (error instanceof Error) {
      if (
        error.message.includes("rate limit") ||
        error.message.includes("quota")
      ) {
        analysisError = ErrorCreators.rateLimitExceeded(100) // AI service rate limit
      } else if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        analysisError = ErrorCreators.networkError({ service: "AI Analysis" })
      } else {
        analysisError = ErrorCreators.aiServiceUnavailable()
      }
    } else {
      analysisError = ErrorCreators.internal("Unknown analysis error", {
        error
      })
    }

    // Log the structured error
    console.error("Structured analysis error:", {
      bookId,
      title,
      error: analysisError,
      originalError: error
    })

    // Update status to failed with retry
    try {
      await RetryHandler.withRetry(
        async () => {
          await db
            .update(books)
            .set({
              analysisStatus: "failed",
              updatedAt: new Date()
            })
            .where(and(eq(books.id, bookId), eq(books.userId, userId)))
        },
        3,
        1000
      )
    } catch (updateError) {
      console.error("Failed to update book status to failed:", updateError)
    }
  }
}
