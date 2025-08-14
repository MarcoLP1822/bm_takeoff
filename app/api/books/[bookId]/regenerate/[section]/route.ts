import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import {
  identifyThemes,
  extractQuotes,
  extractKeyInsights,
  prepareTextForAnalysis,
  validateAndNormalizeAnalysisResult,
  isAIServiceConfigured,
  BookAnalysisResult
} from "@/lib/ai-analysis"
import {
  RetryHandler,
  ErrorCreators
} from "@/lib/error-handling"
import {
  decompressBookContent
} from "@/lib/compression-service"
import { invalidateCache } from "@/lib/cache-service"

type RegenerableSection = "themes" | "quotes" | "insights"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string, section: string }> }
) {
  try {
    // Check authentication
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract params
    const { bookId, section } = await params

    if (!bookId || !section) {
      return NextResponse.json(
        { error: "Book ID and section are required" },
        { status: 400 }
      )
    }

    // Validate section
    if (!["themes", "quotes", "insights"].includes(section)) {
      return NextResponse.json(
        { error: "Invalid section. Must be: themes, quotes, or insights" },
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

    // Get book details
    const [book] = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    if (!book) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 }
      )
    }

    // Check if book has text content
    if (!book.textContent) {
      return NextResponse.json(
        {
          error: "Book has no text content. Please re-upload the file."
        },
        { status: 400 }
      )
    }

    // Get text content (compressed or original)
    let processedText = book.textContent
    const decompressed = await decompressBookContent(bookId)
    if (decompressed) {
      processedText = decompressed
    }

    // Prepare text for analysis
    const preparedText = prepareTextForAnalysis(processedText)
    const chunks = [preparedText]

    // Get current analysis data
    const currentAnalysis = book.analysisData as BookAnalysisResult | null

    if (!currentAnalysis) {
      return NextResponse.json(
        { error: "No existing analysis found. Please run full analysis first." },
        { status: 400 }
      )
    }

    // Regenerate the specific section
    const updatedAnalysis = { ...currentAnalysis }
    
    console.log(`Regenerating ${section} for book: ${book.title}`)

    switch (section as RegenerableSection) {
      case "themes":
        const newThemes = await RetryHandler.withRetry(
          async () => await identifyThemes(
            chunks, 
            book.title, 
            'en', 
            book.author || undefined, 
            2
          ),
          3,
          2000
        )
        updatedAnalysis.themes = newThemes
        console.log(`Generated ${newThemes.length} new themes`)
        break

      case "quotes":
        const newQuotes = await RetryHandler.withRetry(
          async () => await extractQuotes(chunks, 'en', 2),
          3,
          2000
        )
        updatedAnalysis.quotes = newQuotes
        console.log(`Generated ${newQuotes.length} new quotes`)
        break

      case "insights":
        const newInsights = await RetryHandler.withRetry(
          async () => await extractKeyInsights(
            chunks,
            book.title,
            'en',
            book.author || undefined,
            2
          ),
          3,
          2000
        )
        updatedAnalysis.keyInsights = newInsights
        console.log(`Generated ${newInsights.length} new insights`)
        break

      default:
        return NextResponse.json(
          { error: "Invalid section" },
          { status: 400 }
        )
    }

    // Validate and normalize the updated result
    const normalizedResult = validateAndNormalizeAnalysisResult(updatedAnalysis)

    // Update the database
    await RetryHandler.withRetry(
      async () => {
        await db
          .update(books)
          .set({
            analysisData: normalizedResult,
            updatedAt: new Date()
          })
          .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      },
      3,
      1000
    )

    // Invalidate caches
    await invalidateCache("AI_ANALYSIS", userId, bookId)

    // Return the updated section data
    const responseData = {
      success: true,
      section,
      data: section === "themes" ? normalizedResult.themes :
            section === "quotes" ? normalizedResult.quotes :
            normalizedResult.keyInsights,
      updatedAt: new Date().toISOString()
    }

    console.log(`Successfully regenerated ${section} for book: ${book.title}`)
    return NextResponse.json(responseData)

  } catch (error) {
    console.error(`Regeneration error for section ${(await params).section}:`, error)
    
    // Determine error type
    if (error instanceof Error) {
      if (error.message.includes("rate limit") || error.message.includes("quota")) {
        return NextResponse.json(
          { error: "API rate limit exceeded. Please try again later." },
          { status: 429 }
        )
      } else if (error.message.includes("network") || error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Network error. Please check your connection and try again." },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: "Failed to regenerate section" },
      { status: 500 }
    )
  }
}
