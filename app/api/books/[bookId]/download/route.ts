import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { books } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { supabaseAdmin } from '@/lib/supabase'

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

    // Get book details
    const [book] = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    if (!book.fileUrl) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    try {
      // Extract the file path from the URL
      // fileUrl format: https://[project].supabase.co/storage/v1/object/public/books/[path]
      const urlParts = book.fileUrl.split('/storage/v1/object/public/books/')
      if (urlParts.length !== 2) {
        throw new Error('Invalid file URL format')
      }
      
      const filePath = urlParts[1]

      // Download file from Supabase storage
      const { data, error } = await supabaseAdmin.storage
        .from('books')
        .download(filePath)

      if (error) {
        console.error('Supabase download error:', error)
        return NextResponse.json(
          { error: 'Failed to download file from storage' },
          { status: 500 }
        )
      }

      if (!data) {
        return NextResponse.json(
          { error: 'File data not found' },
          { status: 404 }
        )
      }

      // Convert blob to array buffer
      const arrayBuffer = await data.arrayBuffer()
      
      // Determine content type based on file extension
      const getContentType = (fileName: string): string => {
        const extension = fileName.toLowerCase().split('.').pop()
        switch (extension) {
          case 'pdf':
            return 'application/pdf'
          case 'epub':
            return 'application/epub+zip'
          case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          case 'txt':
            return 'text/plain'
          default:
            return 'application/octet-stream'
        }
      }

      const contentType = getContentType(book.fileName)

      // Return file with appropriate headers
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${book.fileName}"`,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

    } catch (downloadError) {
      console.error('Download processing error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to process file download' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Download API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
