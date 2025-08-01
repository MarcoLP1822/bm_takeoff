import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import {
  generateSocialContent,
  ContentGenerationOptions
} from "@/lib/content-generation"
import { BookAnalysisResult } from "@/lib/ai-analysis"
import { ErrorCreators, ValidationHelpers } from "@/lib/error-handling"
import { RetryService } from "@/lib/retry-service"
import { createApiHandler, ApiValidations } from "@/lib/api-error-middleware"
import { invalidateCache } from "@/lib/cache-service"
import { z } from "zod"

const contentGenerationSchema = z.object({
  bookId: ApiValidations.bookId,
  options: z
    .object({
      platforms: z.array(ApiValidations.platform).optional(),
      variationsPerTheme: z.number().optional(),
      includeImages: z.boolean().optional(),
      tone: z
        .enum(["professional", "casual", "inspirational", "educational"])
        .optional(),
      maxRetries: z.number().optional()
    })
    .optional()
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = contentGenerationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { bookId, options = {} } = validationResult.data

    // Fetch the book and ensure it belongs to the user with retry
    const bookData = await RetryService.retryDatabaseOperation(
      async () => {
        const book = await db
          .select()
          .from(books)
          .where(and(eq(books.id, bookId), eq(books.userId, userId)))
          .limit(1)

        if (book.length === 0) {
          throw ErrorCreators.notFound("Book", bookId)
        }

        return book[0]
      },
      {
        operationName: "Fetch Book Data",
        showToast: false
      }
    )

    // Check if analysis data exists
    if (!bookData.analysisData) {
      return NextResponse.json(
        { error: "Book analysis not found. Please analyze the book first." },
        { status: 400 }
      )
    }

    // Validate analysis data structure
    const analysisData = bookData.analysisData as BookAnalysisResult
    if (
      !analysisData.quotes ||
      !analysisData.keyInsights ||
      !analysisData.themes
    ) {
      return NextResponse.json(
        { error: "Invalid analysis data. Please re-analyze the book." },
        { status: 400 }
      )
    }

    // Validate options
    const validatedOptions: ContentGenerationOptions = {
      platforms: options.platforms || [
        "twitter",
        "instagram",
        "linkedin",
        "facebook"
      ],
      variationsPerTheme: Math.min(options.variationsPerTheme || 2, 5), // Limit to 5 variations
      includeImages: options.includeImages !== false, // Default to true
      tone:
        options.tone &&
        ["professional", "casual", "inspirational", "educational"].includes(
          options.tone
        )
          ? options.tone
          : "inspirational",
      maxRetries: Math.min(options.maxRetries || 3, 5) // Limit retries
    }

    // Generate social media content with retry
    const contentVariations = await RetryService.retryAIService(
      async () => {
        return await generateSocialContent(
          analysisData,
          bookData.title,
          bookId,
          userId,
          bookData.author || undefined,
          validatedOptions
        )
      },
      {
        operationName: "Content Generation",
        showToast: false
      }
    )

    // Invalidate content cache
    await invalidateCache("GENERATED_CONTENT", userId, bookId)
    await invalidateCache("CONTENT_LIST", userId)

    return NextResponse.json({
      success: true,
      data: {
        bookId: bookData.id,
        bookTitle: bookData.title,
        author: bookData.author,
        contentVariations,
        generatedAt: new Date().toISOString(),
        options: validatedOptions
      }
    })
  } catch (error) {
    console.error("Content generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    )
  }
}
