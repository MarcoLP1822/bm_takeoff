import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { PublishingService } from "@/lib/publishing-service"
import { z } from "zod"

const retrySchema = z.object({
  contentId: z.string().uuid(),
  accountId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = retrySchema.parse(body)

    // Retry the failed publication
    const result = await PublishingService.retryPublication(
      userId,
      validatedData.contentId,
      validatedData.accountId
    )

    return NextResponse.json({
      success: result.success,
      result,
      message: result.success
        ? "Publication retry successful"
        : "Publication retry failed"
    })
  } catch (error) {
    console.error("Retry publication error:", error)

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
      { error: "Failed to retry publication" },
      { status: 500 }
    )
  }
}
