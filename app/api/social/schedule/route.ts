import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { SchedulingService } from "@/lib/scheduling-service"
import { z } from "zod"

const scheduleSchema = z.object({
  contentId: z.string().uuid(),
  accountIds: z.array(z.string().uuid()).min(1, "At least one account must be selected"),
  scheduledAt: z.string().datetime()
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = scheduleSchema.parse(body)

    // Convert string to Date
    const scheduledAt = new Date(validatedData.scheduledAt)

    // Schedule the post
    await SchedulingService.schedulePost(userId, {
      contentId: validatedData.contentId,
      accountIds: validatedData.accountIds,
      scheduledAt
    })

    return NextResponse.json({
      success: true,
      message: "Post scheduled successfully",
      scheduledAt: scheduledAt.toISOString()
    })

  } catch (error) {
    console.error("Schedule error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to schedule post" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user's scheduled posts
    const scheduledPosts = await SchedulingService.getScheduledPosts(userId)

    return NextResponse.json({
      success: true,
      scheduledPosts
    })

  } catch (error) {
    console.error("Get scheduled posts error:", error)
    
    return NextResponse.json(
      { error: "Failed to get scheduled posts" },
      { status: 500 }
    )
  }
}