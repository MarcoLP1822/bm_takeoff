import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { books } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { bookId } = await params

    // Get book with analysis data
    const [book] = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        analysisStatus: books.analysisStatus,
        analysisData: books.analysisData,
        updatedAt: books.updatedAt
      })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        analysisStatus: book.analysisStatus,
        analysisData: book.analysisData,
        lastUpdated: book.updatedAt
      }
    })

  } catch (error) {
    console.error('Get analysis endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to retrieve book analysis'
      },
      { status: 500 }
    )
  }
}