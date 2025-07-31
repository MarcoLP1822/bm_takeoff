import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { generatedContent, InsertGeneratedContent } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { contentId } = await params

    const content = await db
      .select()
      .from(generatedContent)
      .where(and(
        eq(generatedContent.id, contentId),
        eq(generatedContent.userId, userId)
      ))
      .limit(1)

    if (content.length === 0) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: content[0]
    })

  } catch (error) {
    console.error('Content retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve content. Please try again.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { contentId } = await params
    const body = await request.json()
    const { content: newContent, hashtags, imageUrl, status } = body

    // Verify content belongs to user
    const existingContent = await db
      .select()
      .from(generatedContent)
      .where(and(
        eq(generatedContent.id, contentId),
        eq(generatedContent.userId, userId)
      ))
      .limit(1)

    if (existingContent.length === 0) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    // Update content
    const updateData: Partial<InsertGeneratedContent> = {
      updatedAt: new Date()
    }

    if (newContent !== undefined) updateData.content = newContent
    if (hashtags !== undefined) updateData.hashtags = hashtags
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (status !== undefined) updateData.status = status

    const updated = await db
      .update(generatedContent)
      .set(updateData)
      .where(eq(generatedContent.id, contentId))
      .returning()

    return NextResponse.json({
      success: true,
      data: updated[0]
    })

  } catch (error) {
    console.error('Content update error:', error)
    return NextResponse.json(
      { error: 'Failed to update content. Please try again.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { contentId } = await params

    // Verify content belongs to user and delete
    const deleted = await db
      .delete(generatedContent)
      .where(and(
        eq(generatedContent.id, contentId),
        eq(generatedContent.userId, userId)
      ))
      .returning()

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully'
    })

  } catch (error) {
    console.error('Content deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete content. Please try again.' },
      { status: 500 }
    )
  }
}