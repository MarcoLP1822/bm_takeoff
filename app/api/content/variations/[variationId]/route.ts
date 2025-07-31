import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { generatedContent } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ variationId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { variationId } = await params
    const body = await request.json()
    const { post } = body

    if (!post || !post.id) {
      return NextResponse.json(
        { error: 'Post data is required' },
        { status: 400 }
      )
    }

    // Validate post data
    if (!post.platform || !post.content) {
      return NextResponse.json(
        { error: 'Platform and content are required' },
        { status: 400 }
      )
    }

    // Update the generated content
    const updatedContent = await db
      .update(generatedContent)
      .set({
        content: post.content,
        hashtags: post.hashtags || [],
        imageUrl: post.imageUrl,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(generatedContent.id, post.id),
          eq(generatedContent.userId, userId)
        )
      )
      .returning()

    if (updatedContent.length === 0) {
      return NextResponse.json(
        { error: 'Content not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedContent[0]
    })

  } catch (error) {
    console.error('Content update error:', error)
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ variationId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { variationId } = await params

    // Delete all content for this variation that belongs to the user
    const deletedContent = await db
      .delete(generatedContent)
      .where(
        and(
          eq(generatedContent.id, variationId),
          eq(generatedContent.userId, userId)
        )
      )
      .returning()

    if (deletedContent.length === 0) {
      return NextResponse.json(
        { error: 'Content variation not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Content variation deleted successfully'
    })

  } catch (error) {
    console.error('Content deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete content variation' },
      { status: 500 }
    )
  }
}