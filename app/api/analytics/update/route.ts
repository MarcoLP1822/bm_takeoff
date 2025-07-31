import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { AnalyticsService } from "@/lib/analytics-service"

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update analytics for all published posts
    await AnalyticsService.updateAllAnalytics(userId)

    return NextResponse.json({
      success: true,
      message: "Analytics updated successfully"
    })
  } catch (error) {
    console.error("Analytics update API error:", error)
    return NextResponse.json(
      { error: "Failed to update analytics" },
      { status: 500 }
    )
  }
}