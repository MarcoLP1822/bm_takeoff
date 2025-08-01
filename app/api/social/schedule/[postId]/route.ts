import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { SchedulingService } from "@/lib/scheduling-service"
import { z } from "zod"

const rescheduleSchema = z.object({
  scheduledAt: z.string().datetime()
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { postId } = await params

    // Cancel the scheduled post
    await SchedulingService.cancelScheduledPost(userId, postId)

    return NextResponse.json({
      success: true,
      message: "Scheduled post cancelled successfully"
    })
  } catch (error) {
    console.error("Cancel scheduled post error:", error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to cancel scheduled post" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { postId } = await params
    const body = await request.json()
    const validatedData = rescheduleSchema.parse(body)

    // Convert string to Date
    const newScheduledAt = new Date(validatedData.scheduledAt)

    // Reschedule the post
    await SchedulingService.reschedulePost(userId, postId, newScheduledAt)

    return NextResponse.json({
      success: true,
      message: "Post rescheduled successfully",
      scheduledAt: newScheduledAt.toISOString()
    })
  } catch (error) {
    console.error("Reschedule post error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to reschedule post" },
      { status: 500 }
    )
  }
}
