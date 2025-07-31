import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { generatedContent } from '@/db/schema'
import { ContentVariation } from '@/lib/content-generation'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { bookId, contentVariations } = body

    if (!bookId || !contentVariations || !Array.isArray(contentVariations)) {
      return NextResponse.json(
        { error: 'Book ID and content variations are required' },
        { status: 400 }
      )
    }

    // Prepare content records for insertion
    const contentRecords = []
    
    for (const variation of contentVariations as ContentVariation[]) {
      for (const post of variation.posts) {
        contentRecords.push({
          bookId,
          userId,
          platform: post.platform,
          contentType: 'post' as const,
          content: post.content,
          hashtags: post.hashtags,
          imageUrl: post.imageUrl || null,
          status: 'draft' as const
        })
      }
    }

    // Insert all content records
    const savedContent = await db
      .insert(generatedContent)
      .values(contentRecords)
      .returning()

    return NextResponse.json({
      success: true,
      data: {
        savedCount: savedContent.length,
        contentIds: savedContent.map(c => c.id)
      }
    })

  } catch (error) {
    console.error('Content save error:', error)
    return NextResponse.json(
      { error: 'Failed to save content. Please try again.' },
      { status: 500 }
    )
  }
}