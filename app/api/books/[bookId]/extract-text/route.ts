import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase"
import { TextExtractionService } from "@/lib/text-extraction"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
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

    // Get book record from database
    const [book] = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    // Check if text extraction is needed
    if (book.textContent && book.analysisStatus !== "failed") {
      return NextResponse.json({
        success: true,
        message: "Text already extracted",
        book: {
          id: book.id,
          title: book.title,
          analysisStatus: book.analysisStatus
        }
      })
    }

    // Update status to processing
    await db
      .update(books)
      .set({
        analysisStatus: "processing",
        updatedAt: new Date()
      })
      .where(eq(books.id, bookId))

    try {
      // Download file from Supabase Storage
      const fileName = book.fileUrl.split("/").pop()
      if (!fileName) {
        throw new Error("Invalid file URL")
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("books")
        .download(fileName)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`)
      }

      // Convert to buffer
      const buffer = Buffer.from(await fileData.arrayBuffer())

      // Determine MIME type from file extension
      const extension = fileName.split(".").pop()?.toLowerCase()
      let mimeType = ""

      switch (extension) {
        case "pdf":
          mimeType = "application/pdf"
          break
        case "epub":
          mimeType = "application/epub+zip"
          break
        case "docx":
          mimeType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          break
        case "txt":
          mimeType = "text/plain"
          break
        default:
          throw new Error(`Unsupported file extension: ${extension}`)
      }

      // Extract text content
      const extractionResult = await TextExtractionService.extractText(
        buffer,
        mimeType,
        book.fileName
      )

      // Update book record with extracted text
      const [updatedBook] = await db
        .update(books)
        .set({
          textContent: extractionResult.text,
          title: extractionResult.metadata?.title || book.title,
          author: extractionResult.metadata?.author || book.author,
          analysisStatus: "pending",
          updatedAt: new Date()
        })
        .where(eq(books.id, bookId))
        .returning()

      return NextResponse.json({
        success: true,
        message: "Text extraction completed successfully",
        book: {
          id: updatedBook.id,
          title: updatedBook.title,
          author: updatedBook.author,
          analysisStatus: updatedBook.analysisStatus,
          wordCount: extractionResult.metadata?.wordCount
        }
      })
    } catch (extractionError) {
      // Update status to failed
      await db
        .update(books)
        .set({
          analysisStatus: "failed",
          updatedAt: new Date()
        })
        .where(eq(books.id, bookId))

      console.error("Text extraction failed:", extractionError)
      return NextResponse.json(
        {
          error: "Text extraction failed",
          details:
            extractionError instanceof Error
              ? extractionError.message
              : "Unknown error"
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Extract text endpoint error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "An unexpected error occurred during text extraction"
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
