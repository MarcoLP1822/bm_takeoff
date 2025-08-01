import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { generatedContent } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { variationId, post } = body

    if (!variationId || !post || !post.id) {
      return NextResponse.json(
        { error: "Variation ID and post data are required" },
        { status: 400 }
      )
    }

    // Validate post data
    if (!post.platform || !post.content) {
      return NextResponse.json(
        { error: "Platform and content are required" },
        { status: 400 }
      )
    }

    // Auto-save the content (update without returning full response for performance)
    await db
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

    return NextResponse.json({
      success: true,
      message: "Content auto-saved",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Auto-save error:", error)
    // Don't return error for auto-save to avoid disrupting user experience
    return NextResponse.json({
      success: false,
      message: "Auto-save failed",
      timestamp: new Date().toISOString()
    })
  }
}
