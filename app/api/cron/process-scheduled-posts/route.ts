import { NextRequest, NextResponse } from "next/server"
import { SchedulingService } from "@/lib/scheduling-service"

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization")
    const expectedToken = process.env.CRON_SECRET || "your-cron-secret"

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Processing scheduled posts...")

    // Process due posts
    await SchedulingService.processDuePosts()

    console.log("Scheduled posts processing completed")

    return NextResponse.json({
      success: true,
      message: "Scheduled posts processed successfully",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Cron job error:", error)

    return NextResponse.json(
      { error: "Failed to process scheduled posts" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({
    status: "healthy",
    service: "scheduled-posts-processor",
    timestamp: new Date().toISOString()
  })
}
