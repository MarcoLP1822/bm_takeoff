import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq, and } from "drizzle-orm"

// Analysis progress types
interface AnalysisProgress {
  status: "in_progress" | "completed" | "failed";
  current_step: "text_extraction" | "themes_identification" | "quotes_extraction" | "insights_generation";
  steps: {
    text_extraction: "completed" | "in_progress" | "pending" | "failed";
    themes_identification: "completed" | "in_progress" | "pending" | "failed";
    quotes_extraction: "completed" | "in_progress" | "pending" | "failed";
    insights_generation: "completed" | "in_progress" | "pending" | "failed";
  };
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export async function GET(
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

    // Get book analysis status and progress
    const [book] = await db
      .select({
        id: books.id,
        title: books.title,
        analysisStatus: books.analysisStatus,
        analysisProgress: books.analysisProgress,
        analysisData: books.analysisData,
        updatedAt: books.updatedAt
      })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    if (!book) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 }
      )
    }

    // Get granular progress or fallback to legacy status
    const progress = book.analysisProgress as AnalysisProgress | null
    
    // If no granular progress but we have legacy status, create compatible response
    if (!progress && book.analysisStatus) {
      const legacyResponse = {
        bookId: book.id,
        title: book.title,
        status: book.analysisStatus,
        legacy: true,
        updatedAt: book.updatedAt,
        ...(book.analysisData ? { analysisData: book.analysisData } : {})
      }
      
      return NextResponse.json(legacyResponse)
    }

    // Return granular progress information
    const response = {
      bookId: book.id,
      title: book.title,
      status: book.analysisStatus,
      progress: progress || {
        status: "pending",
        current_step: "text_extraction",
        steps: {
          text_extraction: "pending",
          themes_identification: "pending",
          quotes_extraction: "pending",
          insights_generation: "pending"
        },
        started_at: new Date().toISOString()
      },
      updatedAt: book.updatedAt,
      ...(book.analysisData ? { analysisData: book.analysisData } : {})
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Analysis status error:", error)
    return NextResponse.json(
      { error: "Failed to get analysis status" },
      { status: 500 }
    )
  }
}
