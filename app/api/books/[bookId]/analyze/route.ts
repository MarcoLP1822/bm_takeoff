import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import {
  analyzeBookContent,
  validateAndNormalizeAnalysisResult,
  isAIServiceConfigured,
  prepareTextForAnalysis,
  estimateAnalysisTime,
  identifyThemes,
  extractQuotes,
  extractKeyInsights,
  generateChapterSummaries,
  generateOverallSummary,
  identifyGenreAndAudience,
  identifyDiscussionPoints
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

// Analysis progress types
interface AnalysisProgress {
  status: "in_progress" | "completed" | "failed";
  current_step: "text_extraction" | "themes_identification" | "quotes_extraction" | "insights_generation" | "chapter_summaries" | "overall_summary" | "genre_audience" | "discussion_points";
  steps: {
    text_extraction: "completed" | "in_progress" | "pending" | "failed";
    themes_identification: "completed" | "in_progress" | "pending" | "failed";
    quotes_extraction: "completed" | "in_progress" | "pending" | "failed";
    insights_generation: "completed" | "in_progress" | "pending" | "failed";
    chapter_summaries: "completed" | "in_progress" | "pending" | "failed";
    overall_summary: "completed" | "in_progress" | "pending" | "failed";
    genre_audience: "completed" | "in_progress" | "pending" | "failed";
    discussion_points: "completed" | "in_progress" | "pending" | "failed";
  };
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

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

    // Update status to processing with granular progress tracking
    const initialProgress: AnalysisProgress = {
      status: "in_progress",
      current_step: "text_extraction",
      steps: {
        text_extraction: "in_progress",
        themes_identification: "pending",
        quotes_extraction: "pending",
        insights_generation: "pending",
        chapter_summaries: "pending",
        overall_summary: "pending",
        genre_audience: "pending",
        discussion_points: "pending"
      },
      started_at: new Date().toISOString()
    }

    await RetryHandler.withRetry(
      async () => {
        await db
          .update(books)
          .set({
            analysisStatus: "processing",
            analysisProgress: initialProgress,
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
 * Update analysis progress in the database
 */
async function updateAnalysisProgress(
  bookId: string,
  userId: string,
  currentStep: AnalysisProgress["current_step"],
  stepStatus: "completed" | "in_progress" | "failed",
  errorMessage?: string
): Promise<void> {
  try {
    // Get current progress
    const [book] = await db
      .select({ analysisProgress: books.analysisProgress })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    const currentProgress = (book?.analysisProgress as AnalysisProgress) || {
      status: "in_progress" as const,
      current_step: currentStep,
      steps: {
        text_extraction: "pending" as const,
        themes_identification: "pending" as const, 
        quotes_extraction: "pending" as const,
        insights_generation: "pending" as const,
        chapter_summaries: "pending" as const,
        overall_summary: "pending" as const,
        genre_audience: "pending" as const,
        discussion_points: "pending" as const
      },
      started_at: new Date().toISOString()
    }

    // Update the specific step
    const updatedSteps = {
      ...currentProgress.steps,
      [currentStep]: stepStatus
    }

    // Determine overall status
    let overallStatus: AnalysisProgress["status"] = currentProgress.status
    if (stepStatus === "failed") {
      overallStatus = "failed"
    } else if (Object.values(updatedSteps).every(status => status === "completed")) {
      overallStatus = "completed"
    }

    const updatedProgress: AnalysisProgress = {
      ...currentProgress,
      status: overallStatus,
      current_step: currentStep,
      steps: updatedSteps,
      ...(stepStatus === "completed" && overallStatus === "completed" ? 
        { completed_at: new Date().toISOString() } : {}),
      ...(errorMessage ? { error_message: errorMessage } : {})
    }

    await db
      .update(books)
      .set({
        analysisProgress: updatedProgress,
        updatedAt: new Date()
      })
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))

  } catch (error) {
    console.error("Failed to update analysis progress:", error)
  }
}

/**
 * Process book analysis in the background with granular progress tracking
 */
async function processBookAnalysis(
  bookId: string,
  textContent: string,
  title: string,
  author: string | null,
  userId: string
): Promise<void> {
  try {
    console.log(`Starting granular AI analysis for book: ${title}`)
    
    // Step 1: Text preparation (already completed when we get here)
    await updateAnalysisProgress(bookId, userId, "text_extraction", "completed")
    
    // Check if we have compressed text content, decompress if needed
    let processedText = textContent
    const decompressed = await decompressBookContent(bookId)
    if (decompressed) {
      console.log("Found compressed content, using decompressed version")
      processedText = decompressed
    } else {
      console.log("No compressed content found, using original text")
      // Compress and cache the text content for future use
      if (textContent && textContent.trim().length > 100) {
        await compressBookContent(bookId, textContent)
        console.log("Text content compressed and cached")
      }
    }

    // Prepare text for analysis
    const preparedText = prepareTextForAnalysis(processedText)
    const chunks = [preparedText] // Single chunk for now, can be expanded later

    // Step 2: Themes identification
    await updateAnalysisProgress(bookId, userId, "themes_identification", "in_progress")
    console.log("Starting themes identification...")
    const themes = await RetryHandler.withRetry(
      async () => await identifyThemes(chunks, title, 'en', author || undefined, 2),
      3,
      2000
    )
    await updateAnalysisProgress(bookId, userId, "themes_identification", "completed")
    console.log("Themes identification completed:", themes.length, "themes found")

    // Step 3: Quotes extraction
    await updateAnalysisProgress(bookId, userId, "quotes_extraction", "in_progress")
    console.log("Starting quotes extraction...")
    const quotes = await RetryHandler.withRetry(
      async () => await extractQuotes(chunks, 'en', 2),
      3,
      2000
    )
    await updateAnalysisProgress(bookId, userId, "quotes_extraction", "completed")
    console.log("Quotes extraction completed:", quotes.length, "quotes found")

    // Step 4: Insights generation
    await updateAnalysisProgress(bookId, userId, "insights_generation", "in_progress")
    console.log("Starting insights generation...")
    const keyInsights = await RetryHandler.withRetry(
      async () => await extractKeyInsights(chunks, title, 'en', author || undefined, 2),
      3,
      2000
    )
    await updateAnalysisProgress(bookId, userId, "insights_generation", "completed")
    console.log("Insights generation completed:", keyInsights.length, "insights found")

    // Step 5: Chapter summaries generation
    await updateAnalysisProgress(bookId, userId, "chapter_summaries", "in_progress")
    console.log("Starting chapter summaries generation...")
    const chapterSummaries = await RetryHandler.withRetry(
      async () => await generateChapterSummaries(preparedText, 'en', 2),
      3,
      2000
    )
    await updateAnalysisProgress(bookId, userId, "chapter_summaries", "completed")
    console.log("Chapter summaries generation completed:", chapterSummaries.length, "chapters found")

    // Step 6: Overall summary generation
    await updateAnalysisProgress(bookId, userId, "overall_summary", "in_progress")
    console.log("Starting overall summary generation...")
    const overallSummary = await RetryHandler.withRetry(
      async () => await generateOverallSummary(chunks, title, 'en', author || undefined, 2),
      3,
      2000
    )
    await updateAnalysisProgress(bookId, userId, "overall_summary", "completed")
    console.log("Overall summary generation completed")

    // Step 7: Genre and audience identification
    await updateAnalysisProgress(bookId, userId, "genre_audience", "in_progress")
    console.log("Starting genre and audience identification...")
    const genreAndAudience = await RetryHandler.withRetry(
      async () => await identifyGenreAndAudience(chunks, title, 'en', author || undefined, 2),
      3,
      2000
    )
    await updateAnalysisProgress(bookId, userId, "genre_audience", "completed")
    console.log("Genre and audience identification completed")

    // Step 8: Discussion points identification
    await updateAnalysisProgress(bookId, userId, "discussion_points", "in_progress")
    console.log("Starting discussion points identification...")
    const discussionPoints = await RetryHandler.withRetry(
      async () => await identifyDiscussionPoints(chunks, title, 'en', author || undefined, 2),
      3,
      2000
    )
    await updateAnalysisProgress(bookId, userId, "discussion_points", "completed")
    console.log("Discussion points identification completed:", discussionPoints.length, "points found")

    // Assemble the complete analysis result
    const analysisResult = {
      themes,
      quotes,
      keyInsights,
      chapterSummaries,
      overallSummary,
      genre: genreAndAudience.genre,
      targetAudience: genreAndAudience.targetAudience,
      discussionPoints
    }

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
            genre: normalizedResult.genre,
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

    console.log(`Granular analysis completed successfully for book: ${title}`)
  } catch (error) {
    console.error("Analysis processing error:", error)

    // Update progress to failed
    const currentStep = error instanceof Error && error.message.includes("themes") ? "themes_identification" :
                      error instanceof Error && error.message.includes("quotes") ? "quotes_extraction" :
                      error instanceof Error && error.message.includes("insights") ? "insights_generation" : 
                      "text_extraction"
    
    await updateAnalysisProgress(bookId, userId, currentStep as AnalysisProgress["current_step"], "failed", error instanceof Error ? error.message : "Unknown error")

    // Determine error type and create appropriate AppError
    let analysisError: AppError
    if (error instanceof Error) {
      if (
        error.message.includes("rate limit") ||
        error.message.includes("quota")
      ) {
        analysisError = ErrorCreators.rateLimitExceeded(100)
      } else if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        analysisError = ErrorCreators.networkError({ service: "AI Analysis" })
      } else {
        analysisError = ErrorCreators.aiServiceUnavailable()
      }
    } else {
      analysisError = ErrorCreators.internal("Unknown analysis error", { error })
    }

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
